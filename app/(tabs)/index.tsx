import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  RefreshControl, 
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { getAllBooks, countBooksByStatus, addBook, updateBookStatus, updateBook, deleteBook } from '../../database/db';
import { Ionicons } from '@expo/vector-icons';

interface Book {
  id: number;
  title: string;
  author: string | null;
  status: string;
  created_at: number;
}

interface BookStats {
  status: string;
  count: number;
}

export default function HomeScreen() {
  const [books, setBooks] = useState<Book[]>([]);
  const [stats, setStats] = useState<BookStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Add Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Edit Modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editStatus, setEditStatus] = useState('planning');

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // all | planning | reading | done

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      const allBooks = await getAllBooks();
      const bookStats = await countBooksByStatus();
      setBooks(allBooks as Book[]);
      setStats(bookStats as BookStats[]);
      console.log('📚 Đã load được sách:', allBooks.length);
    } catch (error) {
      console.error('Lỗi khi load sách:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadBooks();
  };

  // Filtered books with useMemo for performance
  const filteredBooks = useMemo(() => {
    let result = books;

    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter(book => book.status === filterStatus);
    }

    // Search by title or author
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(book => 
        book.title.toLowerCase().includes(query) ||
        (book.author && book.author.toLowerCase().includes(query))
      );
    }

    return result;
  }, [books, filterStatus, searchQuery]);

  // Clear search with useCallback
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Handle filter change with useCallback
  const handleFilterChange = useCallback((status: string) => {
    setFilterStatus(status);
  }, []);

  const openAddModal = () => {
    setTitle('');
    setAuthor('');
    setModalVisible(true);
  };

  const closeAddModal = () => {
    setModalVisible(false);
    setTitle('');
    setAuthor('');
  };

  const handleAddBook = async () => {
    // Validate title
    if (!title.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên sách!');
      return;
    }

    setIsSaving(true);
    try {
      await addBook(title.trim(), author.trim() || '');
      console.log('✅ Đã thêm sách:', title);
      
      // Reload danh sách
      await loadBooks();
      
      // Đóng modal và reset form
      closeAddModal();
      
      Alert.alert('Thành công', 'Đã thêm sách vào danh sách!');
    } catch (error) {
      console.error('Lỗi khi thêm sách:', error);
      Alert.alert('Lỗi', 'Không thể thêm sách. Vui lòng thử lại!');
    } finally {
      setIsSaving(false);
    }
  };

  const getNextStatus = (currentStatus: string): string => {
    switch (currentStatus) {
      case 'planning':
        return 'reading';
      case 'reading':
        return 'done';
      case 'done':
        return 'planning';
      default:
        return 'planning';
    }
  };

  const handleCycleStatus = async (book: Book) => {
    const nextStatus = getNextStatus(book.status);
    
    try {
      await updateBookStatus(book.id, nextStatus);
      console.log(`📖 Changed "${book.title}" from ${book.status} → ${nextStatus}`);
      
      // Reload danh sách
      await loadBooks();
    } catch (error) {
      console.error('Lỗi khi cập nhật status:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái. Vui lòng thử lại!');
    }
  };

  const openEditModal = (book: Book) => {
    setEditingBook(book);
    setEditTitle(book.title);
    setEditAuthor(book.author || '');
    setEditStatus(book.status);
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditingBook(null);
    setEditTitle('');
    setEditAuthor('');
    setEditStatus('planning');
  };

  const handleEditBook = async () => {
    if (!editingBook) return;

    // Validate title
    if (!editTitle.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên sách!');
      return;
    }

    setIsSaving(true);
    try {
      await updateBook(
        editingBook.id,
        editTitle.trim(),
        editAuthor.trim() || '',
        editStatus
      );
      console.log('✅ Đã cập nhật sách:', editTitle);
      
      // Reload danh sách
      await loadBooks();
      
      // Đóng modal
      closeEditModal();
      
      Alert.alert('Thành công', 'Đã cập nhật thông tin sách!');
    } catch (error) {
      console.error('Lỗi khi cập nhật sách:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật sách. Vui lòng thử lại!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBook = async () => {
    if (!editingBook) return;

    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa sách "${editingBook.title}"?\n\nHành động này không thể hoàn tác.`,
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            try {
              await deleteBook(editingBook.id);
              console.log('🗑️ Đã xóa sách:', editingBook.title);
              
              // Reload danh sách
              await loadBooks();
              
              // Đóng modal
              closeEditModal();
              
              Alert.alert('Thành công', 'Đã xóa sách khỏi danh sách!');
            } catch (error) {
              console.error('Lỗi khi xóa sách:', error);
              Alert.alert('Lỗi', 'Không thể xóa sách. Vui lòng thử lại!');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planning': return 'Dự định đọc';
      case 'reading': return 'Đang đọc';
      case 'done': return 'Đã đọc xong';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return '#FF9800';
      case 'reading': return '#2196F3';
      case 'done': return '#4CAF50';
      default: return '#999';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planning': return 'bookmark-outline';
      case 'reading': return 'book-outline';
      case 'done': return 'checkmark-circle';
      default: return 'book';
    }
  };

  const getCountByStatus = (status: string) => {
    const stat = stats.find(s => s.status === status);
    return stat ? stat.count : 0;
  };

  // Render header
  const renderHeader = () => (
    <>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm theo tên sách hoặc tác giả..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          <TouchableOpacity
            style={[styles.filterTab, filterStatus === 'all' && styles.filterTabActive]}
            onPress={() => handleFilterChange('all')}
          >
            <Text style={[styles.filterTabText, filterStatus === 'all' && styles.filterTabTextActive]}>
              Tất cả ({books.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, filterStatus === 'planning' && styles.filterTabActive]}
            onPress={() => handleFilterChange('planning')}
          >
            <Ionicons 
              name="bookmark-outline" 
              size={16} 
              color={filterStatus === 'planning' ? '#FF9800' : '#999'} 
            />
            <Text style={[
              styles.filterTabText, 
              filterStatus === 'planning' && { color: '#FF9800', fontWeight: '600' }
            ]}>
              Dự định ({getCountByStatus('planning')})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, filterStatus === 'reading' && styles.filterTabActive]}
            onPress={() => handleFilterChange('reading')}
          >
            <Ionicons 
              name="book-outline" 
              size={16} 
              color={filterStatus === 'reading' ? '#2196F3' : '#999'} 
            />
            <Text style={[
              styles.filterTabText, 
              filterStatus === 'reading' && { color: '#2196F3', fontWeight: '600' }
            ]}>
              Đang đọc ({getCountByStatus('reading')})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, filterStatus === 'done' && styles.filterTabActive]}
            onPress={() => handleFilterChange('done')}
          >
            <Ionicons 
              name="checkmark-circle" 
              size={16} 
              color={filterStatus === 'done' ? '#4CAF50' : '#999'} 
            />
            <Text style={[
              styles.filterTabText, 
              filterStatus === 'done' && { color: '#4CAF50', fontWeight: '600' }
            ]}>
              Đã đọc ({getCountByStatus('done')})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statusCard, { backgroundColor: '#FFF3E0' }]}>
          <Ionicons name="bookmark-outline" size={28} color="#FF9800" />
          <Text style={styles.statusCount}>{getCountByStatus('planning')}</Text>
          <Text style={styles.statusLabel}>Dự định đọc</Text>
        </View>
        <View style={[styles.statusCard, { backgroundColor: '#E3F2FD' }]}>
          <Ionicons name="book-outline" size={28} color="#2196F3" />
          <Text style={styles.statusCount}>{getCountByStatus('reading')}</Text>
          <Text style={styles.statusLabel}>Đang đọc</Text>
        </View>
        <View style={[styles.statusCard, { backgroundColor: '#E8F5E9' }]}>
          <Ionicons name="checkmark-circle" size={28} color="#4CAF50" />
          <Text style={styles.statusCount}>{getCountByStatus('done')}</Text>
          <Text style={styles.statusLabel}>Đã đọc</Text>
        </View>
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {searchQuery ? '🔍 Kết quả tìm kiếm' : '📖 Danh sách sách'}
        </Text>
        <Text style={styles.sectionSubtitle}>{filteredBooks.length} cuốn</Text>
      </View>
    </>
  );

  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name={searchQuery ? "search-outline" : "book-outline"} 
        size={80} 
        color="#ccc" 
      />
      <Text style={styles.emptyTitle}>
        {searchQuery 
          ? 'Không tìm thấy sách nào' 
          : 'Chưa có sách trong danh sách đọc'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? `Không có kết quả cho "${searchQuery}"`
          : 'Nhấn nút "+" để thêm sách mới vào thư viện của bạn'}
      </Text>
      {searchQuery && (
        <TouchableOpacity 
          style={styles.clearSearchButton}
          onPress={handleClearSearch}
        >
          <Text style={styles.clearSearchButtonText}>Xóa tìm kiếm</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Render book item
  const renderBookItem = ({ item }: { item: Book }) => (
    <TouchableOpacity 
      style={styles.bookItem} 
      activeOpacity={0.7}
      onPress={() => handleCycleStatus(item)}
      onLongPress={() => openEditModal(item)}
    >
      <View style={[
        styles.bookIconContainer,
        { backgroundColor: getStatusColor(item.status) + '15' }
      ]}>
        <Ionicons 
          name={getStatusIcon(item.status) as any} 
          size={28} 
          color={getStatusColor(item.status)} 
        />
      </View>
      
      <View style={styles.bookContent}>
        <Text style={styles.bookTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.bookAuthor} numberOfLines={1}>
          {item.author || 'Không rõ tác giả'}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.cycleHint}>
        <Ionicons name="sync" size={16} color="#999" />
        <Text style={styles.cycleHintText}>Chạm để đổi</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredBooks}
        renderItem={renderBookItem}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#6200ee']}
            tintColor="#6200ee"
          />
        }
        contentContainerStyle={filteredBooks.length === 0 ? styles.emptyListContent : styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab} 
        activeOpacity={0.8}
        onPress={openAddModal}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Book Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeAddModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📚 Thêm sách mới</Text>
              <TouchableOpacity onPress={closeAddModal}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <View style={styles.modalBody}>
              {/* Title Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Tên sách <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tên sách..."
                  value={title}
                  onChangeText={setTitle}
                  autoFocus
                  maxLength={200}
                />
              </View>

              {/* Author Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tác giả</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tên tác giả (tùy chọn)..."
                  value={author}
                  onChangeText={setAuthor}
                  maxLength={100}
                />
              </View>

              {/* Info */}
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={20} color="#2196F3" />
                <Text style={styles.infoText}>
                  Sách sẽ được thêm vào danh sách "Dự định đọc"
                </Text>
              </View>
            </View>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.buttonCancel]}
                onPress={closeAddModal}
                disabled={isSaving}
              >
                <Text style={styles.buttonCancelText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonSave, isSaving && styles.buttonDisabled]}
                onPress={handleAddBook}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Text style={styles.buttonSaveText}>Đang lưu...</Text>
                ) : (
                  <Text style={styles.buttonSaveText}>Thêm sách</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Book Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={closeEditModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ Chỉnh sửa sách</Text>
              <TouchableOpacity onPress={closeEditModal}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView style={styles.modalBody}>
              {/* Title Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Tên sách <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tên sách..."
                  value={editTitle}
                  onChangeText={setEditTitle}
                  maxLength={200}
                />
              </View>

              {/* Author Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tác giả</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tên tác giả (tùy chọn)..."
                  value={editAuthor}
                  onChangeText={setEditAuthor}
                  maxLength={100}
                />
              </View>

              {/* Status Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Trạng thái đọc</Text>
                <View style={styles.statusPicker}>
                  <TouchableOpacity
                    style={[
                      styles.statusOption,
                      editStatus === 'planning' && styles.statusOptionActive,
                      { borderColor: '#FF9800' }
                    ]}
                    onPress={() => setEditStatus('planning')}
                  >
                    <Ionicons 
                      name="bookmark-outline" 
                      size={24} 
                      color={editStatus === 'planning' ? '#FF9800' : '#999'} 
                    />
                    <Text style={[
                      styles.statusOptionText,
                      editStatus === 'planning' && { color: '#FF9800', fontWeight: '600' }
                    ]}>
                      Dự định đọc
                    </Text>
                    {editStatus === 'planning' && (
                      <Ionicons name="checkmark-circle" size={20} color="#FF9800" />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.statusOption,
                      editStatus === 'reading' && styles.statusOptionActive,
                      { borderColor: '#2196F3' }
                    ]}
                    onPress={() => setEditStatus('reading')}
                  >
                    <Ionicons 
                      name="book-outline" 
                      size={24} 
                      color={editStatus === 'reading' ? '#2196F3' : '#999'} 
                    />
                    <Text style={[
                      styles.statusOptionText,
                      editStatus === 'reading' && { color: '#2196F3', fontWeight: '600' }
                    ]}>
                      Đang đọc
                    </Text>
                    {editStatus === 'reading' && (
                      <Ionicons name="checkmark-circle" size={20} color="#2196F3" />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.statusOption,
                      editStatus === 'done' && styles.statusOptionActive,
                      { borderColor: '#4CAF50' }
                    ]}
                    onPress={() => setEditStatus('done')}
                  >
                    <Ionicons 
                      name="checkmark-circle" 
                      size={24} 
                      color={editStatus === 'done' ? '#4CAF50' : '#999'} 
                    />
                    <Text style={[
                      styles.statusOptionText,
                      editStatus === 'done' && { color: '#4CAF50', fontWeight: '600' }
                    ]}>
                      Đã đọc xong
                    </Text>
                    {editStatus === 'done' && (
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Info */}
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={20} color="#FF9800" />
                <Text style={[styles.infoText, { color: '#F57C00' }]}>
                  Nhấn giữ vào sách để chỉnh sửa
                </Text>
              </View>

              {/* Delete Button */}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteBook}
                disabled={isSaving}
              >
                <Ionicons name="trash-outline" size={20} color="#f44336" />
                <Text style={styles.deleteButtonText}>Xóa sách này</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.buttonCancel]}
                onPress={closeEditModal}
                disabled={isSaving}
              >
                <Text style={styles.buttonCancelText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonSave, isSaving && styles.buttonDisabled]}
                onPress={handleEditBook}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Text style={styles.buttonSaveText}>Đang lưu...</Text>
                ) : (
                  <Text style={styles.buttonSaveText}>Lưu thay đổi</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  // Search Styles
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  // Filter Tabs Styles
  filterContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#6200ee',
  },
  filterTabText: {
    fontSize: 14,
    color: '#666',
  },
  filterTabTextActive: {
    color: '#6200ee',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 10,
  },
  statusCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#999',
  },
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bookIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bookContent: {
    flex: 1,
    marginRight: 12,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cycleHint: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  cycleHintText: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  clearSearchButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#6200ee',
    borderRadius: 20,
  },
  clearSearchButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#f44336',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    marginLeft: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCancel: {
    backgroundColor: '#f5f5f5',
  },
  buttonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  buttonSave: {
    backgroundColor: '#6200ee',
  },
  buttonSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // Status Picker Styles
  statusPicker: {
    gap: 12,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#fafafa',
  },
  statusOptionActive: {
    backgroundColor: '#fff',
  },
  statusOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },
  // Delete Button Styles
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f44336',
    marginLeft: 8,
  },
});