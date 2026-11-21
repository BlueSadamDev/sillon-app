import { cosine, evaluate, rank } from './similarity';
import { familyForFile } from './settings';

describe('proximité par le sens (calculs purs)', () => {
  it('calcule le cosinus', () => {
    expect(cosine([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosine([1, 1], [-1, -1])).toBeCloseTo(-1);
    expect(() => cosine([1], [1, 2])).toThrow();
  });

  it('classe et évalue avec un modèle simulé', () => {
    const docs = [
      { id: 'a', vector: [1, 0, 0] },
      { id: 'b', vector: [0, 1, 0] },
      { id: 'c', vector: [0, 0, 1] },
    ];
    expect(rank([0.1, 0.9, 0], docs)[0].id).toBe('b');
    const report = evaluate(
      [
        { text: 'q1', expectedId: 'a', vector: [0.9, 0.1, 0] },
        { text: 'q2', expectedId: 'c', vector: [0, 0.8, 0.6] },
      ],
      docs,
      2,
    );
    expect(report.top1).toBe(1);
    expect(report.topK).toBe(2);
    expect(report.mrr).toBeCloseTo(0.75);
  });

  it('reconnaît la famille du modèle d’après le nom du fichier', () => {
    expect(familyForFile('multilingual-e5-small-Q8_0.gguf').id).toBe('e5');
    expect(familyForFile('embeddinggemma-300M-Q8_0.gguf').id).toBe('embeddinggemma');
    expect(familyForFile('Qwen3-Embedding-0.6B-Q8_0.gguf').id).toBe('qwen3');
    expect(familyForFile('modele.gguf').id).toBe('unknown');
  });
});
