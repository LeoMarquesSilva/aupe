jest.mock('../supabaseClient', () => ({
  authService: {
    getCurrentUser: jest.fn(),
  },
  postService: {},
}));

jest.mock('../supabaseStorageService', () => ({
  supabaseStorageService: {
    prepareImageForInstagram: jest.fn(),
    uploadImage: jest.fn(),
    uploadImageFromUrl: jest.fn(),
  },
}));

import { uploadImagesToSupabaseStorage } from '../postService';
import { authService } from '../supabaseClient';
import { supabaseStorageService } from '../supabaseStorageService';

describe('uploadImagesToSupabaseStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authService.getCurrentUser as jest.Mock).mockResolvedValue({ id: 'user-1' });
  });

  it('throws when image is skipped during preparation', async () => {
    const file = new File([new Uint8Array(10)], 'file.jpg', { type: 'image/jpeg' });
    (supabaseStorageService.prepareImageForInstagram as jest.Mock).mockResolvedValue({
      file: null,
      originalSize: 1024,
      finalSize: 1024,
      wasCompressed: false,
      skipped: true,
      reason: 'A imagem excede 8 MiB',
    });

    await expect(
      uploadImagesToSupabaseStorage(
        [{ id: 'img-1', url: 'data:image/jpeg;base64,aa', order: 0, file }],
        { oversizeStrategy: 'reject' }
      )
    ).rejects.toThrow('A imagem excede 8 MiB');
  });

  it('uploads prepared file and returns resulting url', async () => {
    const file = new File([new Uint8Array(10)], 'file.jpg', { type: 'image/jpeg' });
    (supabaseStorageService.prepareImageForInstagram as jest.Mock).mockResolvedValue({
      file,
      originalSize: 1024,
      finalSize: 900,
      wasCompressed: true,
      skipped: false,
    });
    (supabaseStorageService.uploadImage as jest.Mock).mockResolvedValue({
      url: 'https://example.com/image.jpg',
      path: 'user-1/file.jpg',
      fileName: 'file.jpg',
    });

    const onImagePrepared = jest.fn();
    const result = await uploadImagesToSupabaseStorage(
      [{ id: 'img-1', url: 'data:image/jpeg;base64,aa', order: 0, file }],
      { oversizeStrategy: 'auto_compress', onImagePrepared }
    );

    expect(result).toEqual(['https://example.com/image.jpg']);
    expect(onImagePrepared).toHaveBeenCalledTimes(1);
    expect(supabaseStorageService.uploadImage).toHaveBeenCalledTimes(1);
  });
});

