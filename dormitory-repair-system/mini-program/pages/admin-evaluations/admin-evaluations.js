const { get } = require('../../utils/request');

const ratingLabels = {
  1: '非常不满意',
  2: '不满意',
  3: '一般',
  4: '满意',
  5: '非常满意'
};

Page({
  data: {
    evaluations: [],
    loading: false,
    refreshing: false,
    currentFilter: 'all',
    filterOptions: [
      { key: 'all', label: '全部' },
      { key: '5', label: '5星' },
      { key: '4', label: '4星' },
      { key: '3', label: '3星' },
      { key: '2', label: '2星' },
      { key: '1', label: '1星' }
    ],
    filteredEvaluations: []
  },

  onLoad() {
    this.loadEvaluations();
  },

  onShow() {
    this.loadEvaluations();
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true });
    this.loadEvaluations();
  },

  loadEvaluations() {
    this.setData({ loading: true });

    get('/evaluations/admin')
      .then(res => {
        if (res.code === 200) {
          const evaluations = (res.data || []).map(item => ({
            ...item,
            ratingLabel: ratingLabels[item.rating] || '未评价',
            createdAtFormatted: this.formatDate(item.createdAt)
          }));

          this.setData({ 
            evaluations,
            loading: false,
            refreshing: false
          }, () => {
            this.applyFilter();
          });
        } else {
          this.setData({ loading: false, refreshing: false });
          wx.showToast({
            title: res.message || '加载评价失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        console.error('Load evaluations error:', err);
        this.setData({ loading: false, refreshing: false });
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      });
  },

  onFilterChange(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ currentFilter: key }, () => {
      this.applyFilter();
    });
  },

  applyFilter() {
    const { evaluations, currentFilter } = this.data;
    
    if (currentFilter === 'all') {
      this.setData({ filteredEvaluations: evaluations });
    } else {
      const rating = parseInt(currentFilter);
      const filtered = evaluations.filter(item => item.rating === rating);
      this.setData({ filteredEvaluations: filtered });
    }
  },

  onViewDetail(e) {
    const { id } = e.currentTarget.dataset;
    const evaluation = this.data.evaluations.find(item => item.evaluationId === id);
    if (evaluation) {
      this.setData({
        currentEvaluation: evaluation,
        showDetailModal: true
      });
    }
  },

  onCloseDetail() {
    this.setData({ showDetailModal: false, currentEvaluation: null });
  },

  preventClose() {},

  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
});