const { get, post, put, del } = require('../../utils/request.js');

Page({
  data: {
    repairmen: [],
    isLoading: false,
    showModal: false,
    isEdit: false,
    editId: null,
    form: { username: '', password: '', realName: '', phone: '' }
  },

  onLoad() { this.loadRepairmen(); },

  async loadRepairmen() {
    this.setData({ isLoading: true });
    try {
      const res = await get('/admin/repairmen');
      this.setData({ repairmen: res.code === 200 ? res.data : [] });
    } catch {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  openAddModal() {
    this.setData({
      showModal: true, isEdit: false, editId: null,
      form: { username: '', password: '', realName: '', phone: '' }
    });
  },

  openEditModal(e) {
    const item = e.currentTarget.dataset.item;
    this.setData({
      showModal: true, isEdit: true, editId: item.userId,
      form: { username: item.username, password: '', realName: item.realName, phone: item.phone }
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
        const payload = { realName: form.realName, phone: form.phone };
        if (form.password) payload.password = form.password;
        res = await put(`/admin/repairmen/${editId}`, payload);
      } else {
        res = await post('/admin/repairmen', form);
      }
      if (res.code === 200) {
        wx.showToast({ title: isEdit ? '更新成功' : '添加成功', icon: 'success' });
        this.setData({ showModal: false });
        this.loadRepairmen();
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
      content: '删除该维修工账号？',
      success: async (modalRes) => {
        if (!modalRes.confirm) return;
        try {
          const res = await del(`/admin/repairmen/${id}`);
          if (res.code === 200) {
            wx.showToast({ title: '删除成功', icon: 'success' });
            this.loadRepairmen();
          } else {
            wx.showToast({ title: res.message || '删除失败', icon: 'none' });
          }
        } catch {
          wx.showToast({ title: '网络错误', icon: 'none' });
        }
      }
    });
  }
});
