import * as SQLite from 'expo-sqlite';

// Mở kết nối database
const db = SQLite.openDatabaseSync('readinglist.db');

// Export db để sử dụng ở các nơi khác nếu cần
export { db };

/**
 * Khởi tạo database và tạo bảng books
 */
export const initDatabase = async (): Promise<void> => {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT,
        status TEXT DEFAULT 'planning',
        created_at INTEGER NOT NULL
      );
    `);
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

/**
 * Lấy tất cả sách
 */
export const getAllBooks = async () => {
  try {
    const result = await db.getAllAsync('SELECT * FROM books ORDER BY created_at DESC');
    return result;
  } catch (error) {
    console.error('Error getting books:', error);
    return [];
  }
};

/**
 * Thêm sách mới
 */
export const addBook = async (title: string, author: string, status: string = 'planning') => {
  try {
    const result = await db.runAsync(
      'INSERT INTO books (title, author, status, created_at) VALUES (?, ?, ?, ?)',
      [title, author, status, Date.now()]
    );
    return result;
  } catch (error) {
    console.error('Error adding book:', error);
    throw error;
  }
};

/**
 * Cập nhật sách
 */
export const updateBook = async (id: number, title: string, author: string, status: string) => {
  try {
    const result = await db.runAsync(
      'UPDATE books SET title = ?, author = ?, status = ? WHERE id = ?',
      [title, author, status, id]
    );
    return result;
  } catch (error) {
    console.error('Error updating book:', error);
    throw error;
  }
};

/**
 * Xóa sách
 */
export const deleteBook = async (id: number) => {
  try {
    const result = await db.runAsync('DELETE FROM books WHERE id = ?', [id]);
    return result;
  } catch (error) {
    console.error('Error deleting book:', error);
    throw error;
  }
};

/**
 * Lấy sách theo trạng thái
 */
export const getBooksByStatus = async (status: string) => {
  try {
    const result = await db.getAllAsync(
      'SELECT * FROM books WHERE status = ? ORDER BY created_at DESC',
      [status]
    );
    return result;
  } catch (error) {
    console.error('Error getting books by status:', error);
    return [];
  }
};

export default db;