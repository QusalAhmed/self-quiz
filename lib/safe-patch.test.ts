import { safePatchDoc } from './db';

describe('safePatchDoc', () => {
  it('returns null if doc is null or undefined', async () => {
    expect(await safePatchDoc(null, { meaning: 'test' })).toBeNull();
    expect(await safePatchDoc(undefined, { meaning: 'test' })).toBeNull();
  });

  it('calls doc.incrementalPatch when available', async () => {
    const mockIncrementalPatch = jest.fn().mockResolvedValue({ id: 'w1', meaning: 'new' });
    const mockPatch = jest.fn();

    const doc = {
      id: 'w1',
      incrementalPatch: mockIncrementalPatch,
      patch: mockPatch,
    };

    const result = await safePatchDoc(doc, { meaning: 'new' });
    expect(mockIncrementalPatch).toHaveBeenCalledWith({ meaning: 'new' });
    expect(mockPatch).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 'w1', meaning: 'new' });
  });

  it('falls back to doc.patch when incrementalPatch is not available', async () => {
    const mockPatch = jest.fn().mockResolvedValue({ id: 'w1', meaning: 'fallback' });

    const doc = {
      id: 'w1',
      patch: mockPatch,
    };

    const result = await safePatchDoc(doc, { meaning: 'fallback' });
    expect(mockPatch).toHaveBeenCalledWith({ meaning: 'fallback' });
    expect(result).toEqual({ id: 'w1', meaning: 'fallback' });
  });

  it('catches CONFLICT error and retries with fresh document from collection', async () => {
    const conflictError = {
      code: 'CONFLICT',
      status: 409,
      message:
        'Document update conflict. When changing a document you must work on the previous revision',
    };

    const staleDoc: any = {
      id: 'w1',
      incrementalPatch: jest.fn().mockRejectedValue(conflictError),
      collection: {
        findOne: jest.fn(),
      },
    };

    const freshDoc: any = {
      id: 'w1',
      incrementalPatch: jest.fn().mockResolvedValue({ id: 'w1', meaning: 'resolved' }),
      collection: staleDoc.collection,
    };

    staleDoc.collection.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(freshDoc),
    });

    const result = await safePatchDoc(staleDoc, { meaning: 'resolved' });

    expect(staleDoc.incrementalPatch).toHaveBeenCalledWith({ meaning: 'resolved' });
    expect(staleDoc.collection.findOne).toHaveBeenCalledWith('w1');
    expect(freshDoc.incrementalPatch).toHaveBeenCalledWith({ meaning: 'resolved' });
    expect(result).toEqual({ id: 'w1', meaning: 'resolved' });
  });

  it('re-throws non-conflict errors immediately without retrying', async () => {
    const fatalError = new Error('Disk full');

    const doc = {
      id: 'w1',
      incrementalPatch: jest.fn().mockRejectedValue(fatalError),
      collection: {
        findOne: jest.fn(),
      },
    };

    await expect(safePatchDoc(doc, { meaning: 'fail' })).rejects.toThrow('Disk full');
    expect(doc.collection.findOne).not.toHaveBeenCalled();
  });
});
