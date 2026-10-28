import { describe, expect, it, jest } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { PhotoEditor, type Photo } from './photo-editor';

const mockRendered: Photo = { uri: 'file:///turned.jpg', width: 2000, height: 1000 };
const mockRotate = jest.fn();
const mockCrop = jest.fn();
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: () => {
      const context = {
        rotate: (d: number) => (mockRotate(d), context),
        crop: (b: unknown) => (mockCrop(b), context),
        renderAsync: async () => ({ saveAsync: async () => mockRendered }),
      };
      return context;
    },
  },
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const photo: Photo = { uri: 'file:///taken.jpg', width: 1000, height: 2000 };
const press = async (tree: ReactTestRenderer, label: string) => {
  const [button] = tree.root.findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function');
  await act(async () => {
    await button.props.onPress();
  });
};

describe('photo editor', () => {
  it('hands back the photo untouched when nothing was changed', async () => {
    const onDone = jest.fn();
    let tree!: ReactTestRenderer;
    await act(async () => {
      tree = create(<PhotoEditor photo={photo} onDone={onDone} onCancel={jest.fn()} onRetake={jest.fn()} />);
    });
    const [use] = tree.root.findAll((n) => n.props.accessibilityRole === 'button' && n.findAll((c) => c.props.children === 'Use photo').length > 0 && typeof n.props.onPress === 'function');
    await act(async () => {
      await use.props.onPress();
    });
    expect(onDone).toHaveBeenCalledWith(photo);
    expect(mockRotate).not.toHaveBeenCalled();
  });

  it('turns the photo, can undo it, and turns it again when used', async () => {
    const onDone = jest.fn();
    let tree!: ReactTestRenderer;
    await act(async () => {
      tree = create(<PhotoEditor photo={photo} onDone={onDone} onCancel={jest.fn()} onRetake={jest.fn()} />);
    });
    await press(tree, 'Rotate right');
    expect(mockRotate).toHaveBeenLastCalledWith(90);

    await press(tree, 'Undo');
    await press(tree, 'Rotate left');
    expect(mockRotate).toHaveBeenLastCalledWith(270);

    const [use] = tree.root.findAll((n) => n.props.accessibilityRole === 'button' && n.findAll((c) => c.props.children === 'Use photo').length > 0 && typeof n.props.onPress === 'function');
    await act(async () => {
      await use.props.onPress();
    });
    // Drawn again from the original in one go; the frame still covers it all, so nothing is cropped.
    expect(mockRotate).toHaveBeenLastCalledWith(270);
    expect(mockCrop).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledWith(mockRendered);
  });
});
