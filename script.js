class TestFlightApp {
    constructor() {
        this.apps = [];
        this.filteredApps = [];
        this.currentPage = 1;
        this.appsPerPage = 12;
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.updateStats();
        this.renderApps();
    }

    async loadData() {
        try {
            const response = await fetch('/api/apps');
            if (!response.ok) {
                throw new Error('网络请求失败，状态码: ' + response.status);
            }
            const result = await response.json();
            
            if (result.success) {
                this.apps = result.data || [];
            } else {
                throw new Error(result.error || '数据格式错误');
            }
            
            this.filteredApps = [...this.apps];
            
            const loading = document.querySelector('.loading');
            if (loading) {
                loading.style.display = 'none';
            }
        } catch (error) {
            console.error('加载数据失败:', error);
            this.showError('数据加载失败，请稍后重试: ' + error.message);
        }
    }

    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        
        if (searchInput && searchBtn) {
            searchInput.addEventListener('input', () => this.handleSearch());
            searchBtn.addEventListener('click', () => this.handleSearch());
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleSearch();
            });
        }

        const categoryFilter = document.getElementById('categoryFilter');
        const statusFilter = document.getElementById('statusFilter');
        const sortSelect = document.getElementById('sortSelect');

        if (categoryFilter) categoryFilter.addEventListener('change', () => this.handleFilter());
        if (statusFilter) statusFilter.addEventListener('change', () => this.handleFilter());
        if (sortSelect) sortSelect.addEventListener('change', () => this.handleSort());
    }

    handleSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        
        this.filteredApps = this.apps.filter(app => 
            app.name.toLowerCase().includes(searchTerm) ||
            app.description.toLowerCase().includes(searchTerm) ||
            app.developer.toLowerCase().includes(searchTerm)
        );
        this.applyFiltersAndSort();
    }

    handleFilter() {
        const categoryFilter = document.getElementById('categoryFilter');
        const statusFilter = document.getElementById('statusFilter');
        const searchInput = document.getElementById('searchInput');
        
        const category = categoryFilter ? categoryFilter.value : '';
        const status = statusFilter ? statusFilter.value : '';
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

        this.filteredApps = this.apps.filter(app => {
            const matchesSearch = !searchTerm || 
                app.name.toLowerCase().includes(searchTerm) ||
                app.description.toLowerCase().includes(searchTerm) ||
                app.developer.toLowerCase().includes(searchTerm);
            
            const matchesCategory = !category || app.category === category;
            const matchesStatus = !status || this.getStatusKey(app.status) === status;

            return matchesSearch && matchesCategory && matchesStatus;
        });

        this.applyFiltersAndSort();
    }

    handleSort() {
        const sortSelect = document.getElementById('sortSelect');
        const sortBy = sortSelect ? sortSelect.value : 'date';
        
        this.filteredApps.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'status':
                    return this.getStatusPriority(a.status) - this.getStatusPriority(b.status);
                case 'date':
                default:
                    return new Date(b.lastUpdated) - new Date(a.lastUpdated);
            }
        });

        this.renderApps();
    }

    applyFiltersAndSort() {
        this.handleSort();
        this.currentPage = 1;
        this.updateStats();
    }

    getStatusKey(status) {
        const statusMap = {
            'Y': 'active',
            'F': 'full',
            'N': 'expired',
            'D': 'expired',
            'U': 'expired'
        };
        return statusMap[status] || 'expired';
    }

    getStatusPriority(status) {
        const priorities = { 'Y': 1, 'F': 2, 'N': 3, 'D': 4, 'U': 5 };
        return priorities[status] || 6;
    }

    getStatusText(status) {
        const statusTexts = {
            'Y': '测试中',
            'F': '名额已满',
            'N': '已关闭',
            'D': '已移除',
            'U': '未知状态'
        };
        return statusTexts[status] || '未知';
    }

    getStatusClass(status) {
        const statusClasses = {
            'Y': 'status-active',
            'F': 'status-full',
            'N': 'status-expired',
            'D': 'status-expired',
            'U': 'status-expired'
        };
        return statusClasses[status] || 'status-expired';
    }

    getCategoryText(category) {
        const categoryTexts = {
            'productivity': '效率工具',
            'social': '社交媒体',
            'entertainment': '娱乐',
            'utility': '实用工具',
            'game': '游戏',
            'developer': '开发工具'
        };
        return categoryTexts[category] || '其他';
    }

    updateStats() {
        const totalApps = this.apps.length;
        const activeApps = this.apps.filter(app => app.status === 'Y').length;
        const todayAdded = this.apps.filter(app => {
            const today = new Date().toDateString();
            const appDate = new Date(app.lastUpdated).toDateString();
            return today === appDate;
        }).length;

        const totalElement = document.getElementById('totalApps');
        const activeElement = document.getElementById('activeApps');
        const todayElement = document.getElementById('todayAdded');

        if (totalElement) totalElement.textContent = totalApps.toLocaleString();
        if (activeElement) activeElement.textContent = activeApps.toLocaleString();
        if (todayElement) todayElement.textContent = todayAdded.toLocaleString();
    }

    renderApps() {
        const appsList = document.getElementById('appsList');
        if (!appsList) return;

        const startIndex = (this.currentPage - 1) * this.appsPerPage;
        const endIndex = startIndex + this.appsPerPage;
        const currentApps = this.filteredApps.slice(startIndex, endIndex);

        if (currentApps.length === 0) {
            appsList.innerHTML = '<div class="no-results"><p>没有找到符合条件的应用</p><button onclick="app.clearFilters()" class="btn-primary">清除筛选条件</button></div>';
            return;
        }

        appsList.innerHTML = currentApps.map(app => 
            '<div class="app-card">' +
                '<div class="app-header">' +
                    '<div>' +
                        '<h3 class="app-title">' + this.escapeHtml(app.name) + '</h3>' +
                        '<p class="app-developer">' + this.escapeHtml(app.developer) + '</p>' +
                    '</div>' +
                    '<span class="app-status ' + this.getStatusClass(app.status) + '">' +
                        this.getStatusText(app.status) +
                    '</span>' +
                '</div>' +
                '<p class="app-description">' + this.escapeHtml(app.description) + '</p>' +
                '<div class="app-meta">' +
                    '<span class="app-category">' + this.getCategoryText(app.category) + '</span>' +
                    '<span class="app-date">' + this.formatDate(app.lastUpdated) + '</span>' +
                '</div>' +
                '<div class="app-actions">' +
                    '<a href="' + this.escapeHtml(app.link) + '" target="_blank" class="btn-primary" rel="noopener noreferrer" onclick="app.trackClick(\'' + this.escapeHtml(app.name) + '\')">' +
                        (app.status === 'Y' ? '加入测试' : '查看详情') +
                    '</a>' +
                    '<button onclick="app.copyLink(\'' + this.escapeHtml(app.link) + '\')" class="btn-secondary">' +
                        '复制链接' +
                    '</button>' +
                '</div>' +
            '</div>'
        ).join('');

        this.renderPagination();
    }

    renderPagination() {
        const totalPages = Math.ceil(this.filteredApps.length / this.appsPerPage);
        const pagination = document.getElementById('pagination');
        if (!pagination) return;

        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        paginationHTML += '<button ' + (this.currentPage === 1 ? 'disabled' : '') + ' onclick="app.goToPage(' + (this.currentPage - 1) + ')">上一页</button>';

        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        if (startPage > 1) {
            paginationHTML += '<button onclick="app.goToPage(1)">1</button>';
            if (startPage > 2) paginationHTML += '<span>...</span>';
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += '<button ' + (i === this.currentPage ? 'class="active"' : '') + ' onclick="app.goToPage(' + i + ')">' + i + '</button>';
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) paginationHTML += '<span>...</span>';
            paginationHTML += '<button onclick="app.goToPage(' + totalPages + ')">' + totalPages + '</button>';
        }

        paginationHTML += '<button ' + (this.currentPage === totalPages ? 'disabled' : '') + ' onclick="app.goToPage(' + (this.currentPage + 1) + ')">下一页</button>';

        pagination.innerHTML = paginationHTML;
    }

    goToPage(page) {
        this.currentPage = page;
        this.renderApps();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    clearFilters() {
        const searchInput = document.getElementById('searchInput');
        const categoryFilter = document.getElementById('categoryFilter');
        const statusFilter = document.getElementById('statusFilter');

        if (searchInput) searchInput.value = '';
        if (categoryFilter) categoryFilter.value = '';
        if (statusFilter) statusFilter.value = '';
        
        this.filteredApps = [...this.apps];
        this.currentPage = 1;
        this.handleSort();
    }

    async copyLink(link) {
        try {
            await navigator.clipboard.writeText(link);
            this.showToast('链接已复制到剪贴板');
        } catch (error) {
            console.error('复制失败:', error);
            this.showToast('复制失败，请手动复制');
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message) {
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = 'position: fixed; top: 20px; right: 20px; background: var(--primary-color); color: white; padding: 1rem 1.5rem; border-radius: var(--border-radius); z-index: 1000; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15); animation: slideIn 0.3s ease;';
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 3000);
    }

    trackClick(appName) {
        this.showToast('正在打开 TestFlight...\n\n如果打开失败，可能原因：\n• 测试名额已满或已结束\n• 需要在 iOS 设备上打开\n• 需要先安装 TestFlight 应用')
    }

    showError(message) {
        const appsList = document.getElementById('appsList');
        if (appsList) {
            appsList.innerHTML = '<div class="error-message"><p>' + this.escapeHtml(message) + '</p><button onclick="location.reload()" class="btn-primary">重新加载</button></div>';
        }
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new TestFlightApp();
});