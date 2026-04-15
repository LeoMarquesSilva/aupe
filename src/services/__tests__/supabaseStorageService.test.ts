import {
  INSTAGRAM_MAX_IMAGE_BYTES,
  supabaseStorageService
} from '../supabaseStorageService';

describe('supabaseStorageService.prepareImageForInstagram', () => {
  it('keeps image unchanged when size is within Instagram limit', async () => {
    const file = new File([new Uint8Array(1024)], 'small.jpg', { type: 'image/jpeg' });

    const result = await supabaseStorageService.prepareImageForInstagram(file, {
      oversizeStrategy: 'reject'
    });

    expect(result.skipped).toBe(false);
    expect(result.wasCompressed).toBe(false);
    expect(result.file).toBe(file);
    expect(result.finalSize).toBe(file.size);
  });

  it('rejects oversized image when strategy is reject', async () => {
    const file = new File(
      [new Uint8Array(INSTAGRAM_MAX_IMAGE_BYTES + 1024)],
      'large.jpg',
      { type: 'image/jpeg' }
    );

    const result = await supabaseStorageService.prepareImageForInstagram(file, {
      oversizeStrategy: 'reject'
    });

    expect(result.skipped).toBe(true);
    expect(result.file).toBeNull();
    expect(result.reason).toContain('2207004');
  });
});

