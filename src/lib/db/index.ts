import { openDB, IDBPDatabase } from 'idb';
import { ScannedDocument, ScannedPage, DocumentCategory } from '@/types';
import { generateInitialDemoDocuments } from './demo-data';

const DB_NAME = 'papascan_db';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available on server'));
  }

  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('category', 'category');
          store.createIndex('createdAt', 'createdAt');
          store.createIndex('updatedAt', 'updatedAt');
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Initializes the database and auto-seeds demo data if empty
 */
export async function initDatabase(): Promise<ScannedDocument[]> {
  if (typeof window === 'undefined') return [];
  const db = await getDB();
  const count = await db.count(STORE_NAME);

  if (count === 0) {
    const demoDocs = generateInitialDemoDocuments();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    for (const doc of demoDocs) {
      await tx.store.put(doc);
    }
    await tx.done;
    return demoDocs;
  }

  return getAllDocuments();
}

/**
 * Returns all documents sorted by updatedAt descending
 */
export async function getAllDocuments(): Promise<ScannedDocument[]> {
  if (typeof window === 'undefined') return [];
  const db = await getDB();
  const docs = await db.getAll(STORE_NAME);
  return docs.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Get single document by ID
 */
export async function getDocumentById(id: string): Promise<ScannedDocument | undefined> {
  if (typeof window === 'undefined') return undefined;
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

/**
 * Saves or updates a document
 */
export async function saveDocument(document: ScannedDocument): Promise<ScannedDocument> {
  if (typeof window === 'undefined') return document;
  const db = await getDB();
  const updatedDoc: ScannedDocument = {
    ...document,
    updatedAt: Date.now(),
  };
  await db.put(STORE_NAME, updatedDoc);
  return updatedDoc;
}

/**
 * Deletes a document by ID
 */
export async function deleteDocument(id: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

/**
 * Toggles starred status
 */
export async function toggleStarred(id: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const db = await getDB();
  const doc = await db.get(STORE_NAME, id);
  if (!doc) return false;
  const newStarred = !doc.starred;
  doc.starred = newStarred;
  doc.updatedAt = Date.now();
  await db.put(STORE_NAME, doc);
  return newStarred;
}

/**
 * Filters and searches documents by text and category
 */
export async function searchDocuments(
  query: string,
  category: DocumentCategory = 'All'
): Promise<ScannedDocument[]> {
  const all = await getAllDocuments();
  const cleanQuery = query.trim().toLowerCase();

  return all.filter((doc) => {
    // Category match
    if (category !== 'All' && doc.category !== category) {
      return false;
    }

    if (!cleanQuery) return true;

    // Search in title
    if (doc.title.toLowerCase().includes(cleanQuery)) return true;

    // Search in tags
    if (doc.tags.some((t) => t.toLowerCase().includes(cleanQuery))) return true;

    // Search in OCR text across all pages
    const hasOcrMatch = doc.pages.some((page) =>
      page.ocrText ? page.ocrText.toLowerCase().includes(cleanQuery) : false
    );
    if (hasOcrMatch) return true;

    return false;
  });
}
