const { get, post, put, del, BASE_URL } = require('../../utils/request.js');

Page({
  data: {
    residents: [],
    searchStudentId: '',
    isLoading: false,
    showModal: false,
    isEdit: false,
    editId: null,
    form: { studentId: '', name: '', phone: '', building: '', roomNumber: '', qqEmail: '' }
  },

  onLoad() { this.loadResidents(); },

  async loadResidents() {
    this.setData({ isLoading: true });
    const { searchStudentId } = this.data;
    try {
      const res = await get('/admin/residents' + (searchStudentId ? `?studentId=${searchStudentId}` : ''));
      this.setData({ residents: res.code === 200 ? res.data : [] });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  onSearchInput(e) { this.setData({ searchStudentId: e.detail.value }); },
  handleSearch() { this.loadResidents(); },

  openAddModal() {
    this.setData({
      showModal: true, isEdit: false, editId: null,
      form: { studentId: '', name: '', phone: '', building: '', roomNumber: '', qqEmail: '' }
    });
  },

  openEditModal(e) {
    const item = e.currentTarget.dataset.item;
    this.setData({
      showModal: true, isEdit: true, editId: item.residentId,
      form: { studentId: item.studentId, name: item.name, phone: item.phone, building: item.building, roomNumber: item.roomNumber, qqEmail: item.qqEmail }
    });
  },

  closeModal() { this.setData({ showModal: false }); },

  onFormInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  async handleSave() {
    const { form, isEdit, editId } = this.data;
    try {
      let res;
      if (isEdit) {
        res = await put(`/admin/residents/${editId}`, form);
      } else {
        res = await post('/admin/residents', form);
      }
      if (res.code === 200) {
        wx.showToast({ title: isEdit ? '更新成功' : '添加成功', icon: 'success' });
        this.setData({ showModal: false });
        this.loadResidents();
      } else {
        wx.showToast({ title: res.message || '操作失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '网络错误', icon: 'none' });
    }
  },

  handleDelete(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确认吗？',
      success: async (modalRes) => {
        if (!modalRes.confirm) return;
        try {
          const res = await del(`/admin/residents/${id}`);
          if (res.code === 200) {
            wx.showToast({ title: '删除成功', icon: 'success' });
            this.loadResidents();
          } else {
            wx.showToast({ title: res.message || '删除失败', icon: 'none' });
          }
        } catch {
          wx.showToast({ title: '网络错误', icon: 'none' });
        }
      }
    });
  },

  async handleImport() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xlsx', 'xls'],
      success: (fileRes) => {
        const token = wx.getStorageSync('token');
        wx.showLoading({ title: '导入中...' });
        wx.uploadFile({
          url: `${BASE_URL}/admin/residents/import`,
          filePath: fileRes.tempFiles[0].path,
          name: 'file',
          header: { Authorization: `Bearer ${token}` },
          success: (r) => {
            wx.hideLoading();
            const data = JSON.parse(r.data);
            wx.showToast({ title: data.message || '导入完成', icon: 'none', duration: 3000 });
            this.loadResidents();
          },
          fail: () => {
            wx.hideLoading();
            wx.showToast({ title: '导入失败', icon: 'none' });
          }
        });
      }
    });
  }
});
