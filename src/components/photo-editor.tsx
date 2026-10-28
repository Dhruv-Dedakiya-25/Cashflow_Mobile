import { IconAngle, IconArrowBackUp, IconCamera, IconRestore, IconRotate, IconRotateClockwise, type Icon } from '@tabler/icons-react-native';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Modal, PanResponder, Pressable, View, type GestureResponderEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { clamp, dragBox, fullBox, innerBox, isFull, pixelBox, rotateBox, viewport, type Box, type Grip, type View as Zoom } from '@/lib/crop';
import { radius, space } from '@/theme/tokens';

export type Photo = { uri: string; width: number; height: number };

// A photo editor is dark whatever the app's theme, so the photo is what stands out.
const INK = '#ffffff';
const MUTED = 'rgba(255,255,255,0.7)';
const SHADE = 'rgba(0,0,0,0.55)';
const ACCENT = '#4f8cff';
/** How near a corner a touch must start to take that corner, in screen points. */
const GRAB = 44;
const MAX_TILT = 15;
const MAX_ZOOM = 5;
const DOUBLE_TAP_MS = 300;

/** Everything done to the photo, in order: quarter turns, then a tilt, then the crop frame on the result. */
type Edits = { quarter: number; angle: number; box: Box };

const save = async (context: ReturnType<typeof ImageManipulator.manipulate>): Promise<Photo> => {
  const out = await (await context.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
  return { uri: out.uri, width: out.width, height: out.height };
};

const noZoom = (img: Photo): Zoom => ({ zoom: 1, cx: img.width / 2, cy: img.height / 2 });

/**
 * Crop, turn and straighten a receipt photo before it is read. One finger drags a corner, or the
 * middle to move the frame; two fingers, or a double tap, zoom.
 */
export function PhotoEditor({ photo, onDone, onCancel, onRetake }: { photo: Photo; onDone: (p: Photo) => void; onCancel: () => void; onRetake: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const start: Edits = { quarter: 0, angle: 0, box: fullBox(photo.width, photo.height) };
  const [edits, setEdits] = useState(start);
  // The photo as turned and tilted, which the frame is drawn on.
  const [image, setImage] = useState(photo);
  const [history, setHistory] = useState<Edits[]>([]);
  const [zoom, setZoom] = useState(noZoom(photo));
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [tilting, setTilting] = useState(false);
  // The tilt shown while the slider moves; the photo itself is turned when it is let go.
  const [preview, setPreview] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const vp = area.width ? viewport(area.width, area.height, image.width, image.height, zoom) : null;

  // The gesture's handlers outlive renders, so they read the latest values from here.
  const live = useRef({ edits, image, zoom, area });
  useEffect(() => {
    live.current = { edits, image, zoom, area };
  });
  const gesture = useRef<{ grip: Grip | null; start: Box; x: number; y: number; pinch?: { dist: number; zoom: Zoom; mid: { x: number; y: number } } } | null>(null);
  const lastTap = useRef(0);

  // The handlers read the refs only when a finger moves, never while rendering.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => {
    const now = () => {
      const { edits: e, image: img, zoom: z, area: a } = live.current;
      return { e, img, z, v: viewport(a.width, a.height, img.width, img.height, z) };
    };
    const twoFingers = (ev: GestureResponderEvent) => {
      const [a, b] = ev.nativeEvent.touches;
      return { dist: Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY), mid: { x: (a.pageX + b.pageX) / 2, y: (a.pageY + b.pageY) / 2 } };
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (ev) => {
        const { e, v } = now();
        const b = e.box;
        const { locationX: x, locationY: y } = ev.nativeEvent;
        const sx = (px: number) => (px - v.left) * v.s;
        const sy = (py: number) => (py - v.top) * v.s;
        const corners: [Grip, number, number][] = [['tl', b.x, b.y], ['tr', b.x + b.w, b.y], ['bl', b.x, b.y + b.h], ['br', b.x + b.w, b.y + b.h]];
        const near = corners.find(([, cx, cy]) => Math.hypot(sx(cx) - x, sy(cy) - y) <= GRAB);
        const inside = x >= sx(b.x) && x <= sx(b.x + b.w) && y >= sy(b.y) && y <= sy(b.y + b.h);
        gesture.current = { grip: near ? near[0] : inside ? 'move' : null, start: b, x, y };
      },
      onPanResponderMove: (ev, g) => {
        const gs = gesture.current;
        if (!gs) return;
        const { e, img, z, v } = now();
        if (ev.nativeEvent.touches.length >= 2) {
          const f = twoFingers(ev);
          if (!gs.pinch) {
            gs.pinch = { ...f, zoom: z };
            gs.grip = null;
            setEdits({ ...e, box: gs.start });
          }
          const p = gs.pinch;
          const next = clamp((p.zoom.zoom * f.dist) / p.dist, 1, MAX_ZOOM);
          const s = (v.s / z.zoom) * next;
          setZoom({ zoom: next, cx: p.zoom.cx - (f.mid.x - p.mid.x) / s, cy: p.zoom.cy - (f.mid.y - p.mid.y) / s });
          return;
        }
        if (gs.grip && !gs.pinch) setEdits({ ...e, box: dragBox(gs.start, gs.grip, g.dx / v.s, g.dy / v.s, img.width, img.height) });
      },
      onPanResponderRelease: (_, g) => {
        const gs = gesture.current;
        gesture.current = null;
        if (!gs) return;
        const { e, img, z, v } = now();
        if (gs.grip && e.box !== gs.start) setHistory((h) => [...h, { ...e, box: gs.start }]);
        // A double tap zooms in on that spot, or back out.
        if (gs.pinch || Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6) return;
        const at = Date.now();
        if (at - lastTap.current > DOUBLE_TAP_MS) {
          lastTap.current = at;
          return;
        }
        lastTap.current = 0;
        setZoom(z.zoom > 1 ? noZoom(img) : { zoom: 2.5, cx: v.left + gs.x / v.s, cy: v.top + gs.y / v.s });
      },
    });
  });

  const work = async (step: () => Promise<void>) => {
    setBusy(true);
    try {
      await step();
    } finally {
      setBusy(false);
    }
  };

  // Always from the original, so turning and tilting many times loses nothing.
  const render = (quarter: number, angle: number) =>
    quarter === 0 && angle === 0 ? Promise.resolve(photo) : save(ImageManipulator.manipulate(photo.uri).rotate(quarter + angle));

  const change = (quarter: number, angle: number, boxFor: (img: Photo) => Box) =>
    work(async () => {
      const img = await render(quarter, angle);
      setHistory((h) => [...h, edits]);
      setImage(img);
      setEdits({ quarter, angle, box: boxFor(img) });
      setZoom(noZoom(img));
    });

  const rotate = (by: 90 | -90) => {
    const quarter = (edits.quarter + by + 360) % 360;
    const upright = quarter % 180 === 0 ? photo : { ...photo, width: photo.height, height: photo.width };
    return change(quarter, edits.angle, (img) =>
      edits.angle === 0 ? rotateBox(edits.box, image.width, image.height, by) : innerBox(img.width, img.height, upright.width, upright.height, edits.angle),
    );
  };

  const straighten = (angle: number) => {
    setPreview(null);
    if (angle === edits.angle) return;
    const upright = edits.quarter % 180 === 0 ? photo : { ...photo, width: photo.height, height: photo.width };
    void change(edits.quarter, angle, (img) => innerBox(img.width, img.height, upright.width, upright.height, angle));
  };

  const undo = () =>
    work(async () => {
      const last = history[history.length - 1];
      if (!last) return;
      const img = last.quarter === edits.quarter && last.angle === edits.angle ? image : await render(last.quarter, last.angle);
      setHistory((h) => h.slice(0, -1));
      setImage(img);
      setEdits(last);
      setZoom(noZoom(img));
    });

  const reset = () => {
    setHistory([]);
    setImage(photo);
    setEdits(start);
    setZoom(noZoom(photo));
  };

  const done = () =>
    work(async () => {
      const { quarter, angle, box } = edits;
      const cropped = !isFull(box, image.width, image.height);
      if (quarter === 0 && angle === 0 && !cropped) return onDone(photo);
      const context = ImageManipulator.manipulate(photo.uri);
      if (quarter + angle) context.rotate(quarter + angle);
      if (cropped) context.crop(pixelBox(box, image.width, image.height));
      onDone(await save(context));
    });

  const frame = vp && { left: (edits.box.x - vp.left) * vp.s, top: (edits.box.y - vp.top) * vp.s, width: edits.box.w * vp.s, height: edits.box.h * vp.s };
  const showFrame = frame && !busy && preview === null;
  const angleShown = preview ?? edits.angle;

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, space.md) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingVertical: space.md }}>
          <Pressable onPress={onCancel} disabled={busy} hitSlop={10} accessibilityRole="button">
            <AppText style={{ color: INK }}>{t('web:action.cancel')}</AppText>
          </Pressable>
          <AppText weight="semibold" style={{ color: INK }}>
            {t('scan.edit.title')}
          </AppText>
          <Pressable onPress={done} disabled={busy} hitSlop={10} accessibilityRole="button">
            <AppText weight="semibold" style={{ color: ACCENT }}>
              {t('scan.edit.done')}
            </AppText>
          </Pressable>
        </View>

        <View style={{ flex: 1, margin: space.lg, overflow: 'hidden' }} onLayout={(e) => setArea(e.nativeEvent.layout)}>
          {vp ? (
            <Image
              source={{ uri: image.uri }}
              resizeMode="stretch"
              style={{
                position: 'absolute', left: -vp.left * vp.s, top: -vp.top * vp.s, width: image.width * vp.s, height: image.height * vp.s,
                transform: [{ rotate: `${angleShown - edits.angle}deg` }],
              }}
            />
          ) : null}
          {showFrame ? (
            // Everything drawn over the photo lets touches through to the one view that reads them.
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
              <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: Math.max(frame.top, 0), backgroundColor: SHADE }} />
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: frame.top + frame.height, backgroundColor: SHADE }} />
              <View style={{ position: 'absolute', left: 0, top: frame.top, width: Math.max(frame.left, 0), height: frame.height, backgroundColor: SHADE }} />
              <View style={{ position: 'absolute', right: 0, top: frame.top, left: frame.left + frame.width, height: frame.height, backgroundColor: SHADE }} />
              <View style={{ position: 'absolute', ...frame, borderWidth: 2, borderColor: INK }}>
                {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
                  <View
                    key={c}
                    style={{
                      position: 'absolute', width: 22, height: 22, borderColor: INK,
                      [c[0] === 't' ? 'top' : 'bottom']: -4, [c[1] === 'l' ? 'left' : 'right']: -4,
                      [c[0] === 't' ? 'borderTopWidth' : 'borderBottomWidth']: 5, [c[1] === 'l' ? 'borderLeftWidth' : 'borderRightWidth']: 5,
                    }}
                  />
                ))}
              </View>
            </View>
          ) : null}
          <View {...pan.panHandlers} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
          {busy ? <ActivityIndicator color={INK} style={{ position: 'absolute', alignSelf: 'center', top: '50%' }} /> : null}
        </View>

        {tilting ? (
          <TiltSlider value={angleShown} onMove={setPreview} onEnd={straighten} />
        ) : (
          <AppText variant="small" style={{ color: MUTED, textAlign: 'center', paddingHorizontal: space.xl }}>
            {t('scan.edit.hint')}
          </AppText>
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingTop: space.md, paddingHorizontal: space.sm }}>
          <Tool icon={IconCamera} label={t('scan.edit.retake')} onPress={onRetake} disabled={busy} />
          <Tool icon={IconRotate} label={t('scan.edit.rotateLeft')} onPress={() => rotate(-90)} disabled={busy} />
          <Tool icon={IconRotateClockwise} label={t('scan.edit.rotateRight')} onPress={() => rotate(90)} disabled={busy} />
          <Tool icon={IconAngle} label={t('scan.edit.straighten')} onPress={() => setTilting((v) => !v)} disabled={busy} on={tilting} />
          <Tool icon={IconArrowBackUp} label={t('scan.edit.undo')} onPress={undo} disabled={busy || !history.length} />
          <Tool icon={IconRestore} label={t('scan.edit.reset')} onPress={reset} disabled={busy || !history.length} />
        </View>
      </View>
    </Modal>
  );
}

/** -15 to +15 degrees: the photo turns as the thumb moves, and is redrawn when it is let go. */
function TiltSlider({ value, onMove, onEnd }: { value: number; onMove: (v: number) => void; onEnd: (v: number) => void }) {
  const [width, setWidth] = useState(0);
  const live = useRef({ width, onMove, onEnd });
  useEffect(() => {
    live.current = { width, onMove, onEnd };
  });
  // The handlers read the refs only when a finger moves, never while rendering.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => {
    let startX = 0;
    const at = (x: number) => clamp(Math.round((x / (live.current.width || 1)) * MAX_TILT * 2 - MAX_TILT), -MAX_TILT, MAX_TILT);
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        startX = e.nativeEvent.locationX;
        live.current.onMove(at(startX));
      },
      // From where the finger started, since locationX is unreliable once it leaves the track.
      onPanResponderMove: (_, g) => live.current.onMove(at(startX + g.dx)),
      onPanResponderRelease: (_, g) => live.current.onEnd(at(startX + g.dx)),
    });
  });
  const thumb = ((value + MAX_TILT) / (MAX_TILT * 2)) * width;

  return (
    <View style={{ paddingHorizontal: space.xl, gap: space.xs }}>
      <AppText variant="small" weight="semibold" style={{ color: INK, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
        {value > 0 ? `+${value}°` : `${value}°`}
      </AppText>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: 36, justifyContent: 'center' }} {...pan.panHandlers}>
        <View pointerEvents="none" style={{ height: 2, backgroundColor: MUTED }} />
        <View pointerEvents="none" style={{ position: 'absolute', left: width / 2 - 1, width: 2, height: 12, backgroundColor: MUTED }} />
        <View pointerEvents="none" style={{ position: 'absolute', left: thumb - 11, width: 22, height: 22, borderRadius: 11, backgroundColor: INK }} />
      </View>
    </View>
  );
}

function Tool({ icon: IconComponent, label, onPress, disabled, on }: { icon: Icon; label: string; onPress: () => void; disabled?: boolean; on?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: on }}
      style={({ pressed }) => ({ flex: 1, alignItems: 'center', gap: space.xs, paddingVertical: space.sm, borderRadius: radius.md, backgroundColor: on ? 'rgba(255,255,255,0.15)' : 'transparent', opacity: disabled ? 0.4 : pressed ? 0.6 : 1 })}>
      <IconComponent size={24} color={on ? ACCENT : INK} />
      <AppText variant="caption" numberOfLines={2} style={{ color: INK, textAlign: 'center' }}>
        {label}
      </AppText>
    </Pressable>
  );
}

/**
 * Puts the editor between picking a photo and using it. `edit` runs the picker, opens the editor,
 * and runs the picker again on Retake; it resolves to the edited photo, or undefined when the
 * person gives up. Render `editor` anywhere on the screen.
 */
export function usePhotoEditor(): { edit: (pick: () => Promise<Photo | undefined>) => Promise<Photo | undefined>; editor: ReactNode } {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const resolver = useRef<(r: Photo | 'retake' | undefined) => void>(undefined);
  const finish = (r?: Photo | 'retake') => {
    setPhoto(null);
    resolver.current?.(r);
  };
  const show = (p: Photo) =>
    new Promise<Photo | 'retake' | undefined>((resolve) => {
      resolver.current = resolve;
      setPhoto(p);
    });
  const edit = async (pick: () => Promise<Photo | undefined>) => {
    for (;;) {
      const picked = await pick();
      if (!picked) return undefined;
      const result = await show(picked);
      if (result !== 'retake') return result;
      // ponytail: a fixed wait for the editor to slide away, so the camera never opens over a closing screen; use Modal's onDismiss if it proves too short.
      await new Promise((r) => setTimeout(r, 450));
    }
  };
  return {
    edit,
    editor: photo ? <PhotoEditor photo={photo} onDone={finish} onCancel={() => finish()} onRetake={() => finish('retake')} /> : null,
  };
}
