import { analyzeMorphologicalRelationship, checkDirectAffixation, stemWord } from './morphology';

describe('Morphological Analysis & Stemming', () => {
  describe('stemWord', () => {
    it('stems standard English inflections', () => {
      expect(stemWord('cats')).toBe('cat');
      expect(stemWord('running')).toBe('run');
      expect(stemWord('stopped')).toBe('stop');
      expect(stemWord('happily')).toBe('happi');
      expect(stemWord('prediction')).toBe('predict');
      expect(stemWord('protraction')).toBe('protract');
    });
  });

  describe('checkDirectAffixation', () => {
    it('identifies direct suffixation', () => {
      const res = checkDirectAffixation('retail', 'retailer');
      expect(res.isDirect).toBe(true);
      expect(res.affix).toBe('-er');
    });

    it('identifies e-dropping suffixation', () => {
      const res = checkDirectAffixation('produce', 'producer');
      expect(res.isDirect).toBe(true);
      expect(res.affix).toBe('-er');
    });

    it('identifies y->i mutation suffixation', () => {
      const res = checkDirectAffixation('beauty', 'beautiful');
      expect(res.isDirect).toBe(true);
      expect(res.affix).toBe('-ful');
    });

    it('identifies direct prefixation', () => {
      const res = checkDirectAffixation('happy', 'unhappy');
      expect(res.isDirect).toBe(true);
      expect(res.affix).toBe('un-');
    });
  });

  describe('analyzeMorphologicalRelationship', () => {
    it('detects word family for retail -> retailer', () => {
      const res = analyzeMorphologicalRelationship('retail', 'retailer');
      expect(res.isRelated).toBe(true);
      expect(res.relationship).toBe('word_family');
      expect(res.baseWord).toBe('retail');
      expect(res.affix).toBe('-er');
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('detects morphological relationship for decide -> decision', () => {
      const res = analyzeMorphologicalRelationship('decide', 'decision');
      expect(res.isRelated).toBe(true);
      expect(res.relationship).toBe('morphological');
      expect(res.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('detects morphological relationship for predict -> prediction', () => {
      const res = analyzeMorphologicalRelationship('predict', 'prediction');
      expect(res.isRelated).toBe(true);
      expect(res.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('returns isRelated: false for unrelated words', () => {
      const res = analyzeMorphologicalRelationship('retail', 'restaurant');
      expect(res.isRelated).toBe(false);
      expect(res.relationship).toBe('none');
    });
  });
});
