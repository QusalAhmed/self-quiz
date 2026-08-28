import { supabase } from '@/lib/supabase';
import { fetchAllSupabaseRows } from '@/lib/supabase-pagination';
import { GET, POST } from './route';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('@/lib/supabase-pagination', () => ({
  fetchAllSupabaseRows: jest.fn(),
}));

describe('API: /api/words/[id]/similar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns precomputed similarity records when available', async () => {
    const mockPrecomputed = [
      {
        id: '1:2',
        source_word_id: '1',
        target_word_id: '2',
        source_word: 'retail',
        target_word: 'retailer',
        overall_score: 0.94,
        relationship_type: 'word_family',
        explanation: 'Likely word family',
        signals: {},
      },
    ];

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: mockPrecomputed, error: null }),
    });

    const request = new Request('http://localhost:3000/api/words/1/similar?limit=10') as any;
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.source).toBe('precomputed');
    expect(json.results.length).toBe(1);
    expect(json.results[0].word).toBe('retailer');
    expect(json.results[0].relationship).toBe('word_family');
  });

  it('computes live if precomputed records do not exist', async () => {
    // 1st call for precomputed -> returns []
    (supabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    });

    // 2nd call for single target word
    (supabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: '1', word: 'retail' },
        error: null,
      }),
    });

    // Mock upsert
    (supabase.from as jest.Mock).mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    (fetchAllSupabaseRows as jest.Mock).mockResolvedValue([
      { id: '1', word: 'retail', deleted: false },
      { id: '2', word: 'retailer', deleted: false },
      { id: '3', word: 'trail', deleted: false },
    ]);

    const request = new Request('http://localhost:3000/api/words/1/similar?limit=10') as any;
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.source).toBe('live_computed');
    expect(json.results.length).toBeGreaterThan(0);
    const words = json.results.map((r: any) => r.word);
    expect(words).toContain('retailer');
  });

  it('recomputes and persists similarities via POST', async () => {
    (supabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: '1', word: 'retail' },
        error: null,
      }),
    });

    (supabase.from as jest.Mock).mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    (fetchAllSupabaseRows as jest.Mock).mockResolvedValue([
      { id: '1', word: 'retail', deleted: false },
      { id: '2', word: 'retailer', deleted: false },
    ]);

    const request = new Request('http://localhost:3000/api/words/1/similar', {
      method: 'POST',
    }) as any;
    const response = await POST(request, { params: Promise.resolve({ id: '1' }) });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.totalDiscovered).toBeGreaterThan(0);
  });
});
