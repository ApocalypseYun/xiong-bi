const { get, post, put, del } = require('../../utils/request');

Page({
  data: {
    announcements: [],
    loading: false,
    refreshing: false,
    showModal: false,
    modalType: 'create',
    currentAnnouncement: null,
    formData: {
      title: '',
      content: ''
    },
    submitting: false
  },

  onLoad() {
    this.loadAnnouncements();
  },

  onShow() {
    this.loadAnnouncements();
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true });
    this.loadAnnouncements();
  },

  loadAnnouncements() {
    this.setData({ loading: true });

    get('/announcements')
      .then(res => {
        if (res.code === 200) {
          const announcements = (res.data || []).map(item => ({
            ...item,
            createdAtFormatted: this.formatDate(item.createdAt)
          }));
          this.setData({ 
            announcements,
            loading: false,
            refreshing: false
          });
        } else {
          this.setData({ loading: false, refreshing: false });
          wx.showToast({
            title: res.message || '加载公告失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        console.error('Load announcements error:', err);
        this.setData({ loading: false, refreshing: false });
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      });
  },

  onCreate() {
    this.setData({
      showModal: true,
      modalType: 'create',
      currentAnnouncement: null,
      formData: {
        title: '',
        content: ''
      }
    });
  },

  onEdit(e) {
    const { id } = e.currentTarget.dataset;
    const announcement = this.data.announcements.find(a => a.announcementId === id);
    if (announcement) {
      this.setData({
        showModal: true,
        modalType: 'edit',
        currentAnnouncement: announcement,
        formData: {
          title: announcement.title,
          content: announcement.content
        }
      });
    }
  },

  onCloseModal() {
    this.setData({ showModal: false });
  },

  preventClose() {},

  onTitleInput(e) {
    this.setData({
      'formData.title': e.detail.value
    });
  },

  onContentInput(e) {
    this.setData({
      'formData.content': e.detail.value
    });
  },

  onSubmit() {
    const { formData, modalType } = this.data;
    
    if (!formData.title.trim()) {
      wx.showToast({ title: '请输入标题', icon: 'none' });
      return;
    }
    if (!formData.content.trim()) {
      wx.showToast({ title: '请输入内容', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    if (modalType === 'create') {
      this.createAnnouncement();
    } else {
      this.updateAnnouncement();
    }
  },

  createAnnouncement() {
    const { formData } = this.data;
    
    post('/announcements/admin', {
      title: formData.title.trim(),
      content: formData.content.trim()
    })
      .then(res => {
        this.setData({ submitting: false });
        if (res.code === 200) {
          wx.showToast({
            title: '发布成功',
            icon: 'success'
          });
          this.setData({ showModal: false });
          this.loadAnnouncements();
        } else {
          wx.showToast({
            title: res.message || '发布失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        console.error('Create announcement error:', err);
        this.setData({ submitting: false });
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      });
  },

  updateAnnouncement() {
    const { formData, currentAnnouncement } = this.data;
    
    put(`/announcements/admin/${currentAnnouncement.announcementId}`, {
      title: formData.title.trim(),
      content: formData.content.trim()
    })
      .then(res => {
        this.setData({ submitting: false });
        if (res.code === 200) {
          wx.showToast({
            title: '更新成功',
            icon: 'success'
          });
          this.setData({ showModal: false });
          this.loadAnnouncements();
        } else {
          wx.showToast({
            title: res.message || '更新失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        console.error('Update announcement error:', err);
        this.setData({ submitting: false });
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      });
  },

  onDelete(e) {
    const { id } = e.currentTarget.dataset;
    const announcement = this.data.announcements.find(a => a.announcementId === id);
    
    if (!announcement) return;

    wx.showModal({
      title: '确认删除',
      content: `确定要删除公告"${announcement.title}"吗？此操作不可恢复。`,
      confirmColor: '#e74c3c',
      success: (res) => {
        if (res.confirm) {
          this.deleteAnnouncement(id);
        }
      }
    });
  },

  deleteAnnouncement(id) {
    del(`/announcements/admin/${id}`)
      .then(res => {
        if (res.code === 200) {
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
          this.loadAnnouncements();
        } else {
          wx.showToast({
            title: res.message || '删除失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        console.error('Delete announcement error:', err);
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      });
  },

  onViewDetail(e) {
    const { id } = e.currentTarget.dataset;
    const announcement = this.data.announcements.find(a => a.announcementId === id);
    if (announcement) {
      wx.showModal({
        title: announcement.title,
        content: announcement.content,
        showCancel: false,
        confirmText: '知道了'
      });
    }
  },

  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
});