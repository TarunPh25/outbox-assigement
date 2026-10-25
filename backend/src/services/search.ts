import { Client } from '@elastic/elasticsearch';
import { config } from '../config';

const INDEX = 'emails';
const es = new Client({ node: config.esUrl });

export interface EmailDoc {
  id: string; userId: string; to: string; subject: string; body: string;
  status: string; sender: string; scheduledAt: string; sentAt?: string | null;
}

export async function initSearch() {
  try {
    const exists = await es.indices.exists({ index: INDEX });
    if (!exists) {
      await es.indices.create({
        index: INDEX,
        mappings: {
          properties: {
            id: { type: 'keyword' }, userId: { type: 'keyword' }, status: { type: 'keyword' },
            to: { type: 'text', fields: { raw: { type: 'keyword' } } },
            sender: { type: 'keyword' }, subject: { type: 'text' }, body: { type: 'text' },
            scheduledAt: { type: 'date' }, sentAt: { type: 'date' },
          },
        },
      });
    }
  } catch (e) {
    console.warn('[search] Elasticsearch unavailable, search disabled:', (e as Error).message);
  }
}

/** Index/update is best-effort: Postgres is the source of truth, ES must never break sending. */
export async function indexEmail(doc: EmailDoc) {
  try { await es.index({ index: INDEX, id: doc.id, document: doc }); }
  catch (e) { console.warn('[search] index failed', (e as Error).message); }
}

export async function bulkIndex(docs: EmailDoc[]) {
  if (!docs.length) return;
  try {
    await es.bulk({ refresh: false, operations: docs.flatMap((d) => [{ index: { _index: INDEX, _id: d.id } }, d]) });
  } catch (e) { console.warn('[search] bulk index failed', (e as Error).message); }
}

export async function searchEmails(userId: string, q: string): Promise<string[]> {
  const must: object[] = q
    ? [{
        bool: {
          should: [
            { match_phrase: { to: q } },                                   // "a8@test.com" matches only that address
            { multi_match: { query: q, fields: ['subject^2', 'body'], operator: 'and', fuzziness: 'AUTO' } },
          ],
          minimum_should_match: 1,
        },
      }]
    : [{ match_all: {} }];
  const res = await es.search<EmailDoc>({
    index: INDEX, size: 200, _source: false, sort: [{ scheduledAt: 'desc' }],
    query: { bool: { must, filter: [{ term: { userId } }] } },
  });
  return res.hits.hits.map((h) => String(h._id));
}
