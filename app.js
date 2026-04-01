// ========== 数据管理 ==========
const DB = {
    // 用户相关
    getUsers() {
        return JSON.parse(localStorage.getItem('tri_users') || '[]');
    },
    
    saveUsers(users) {
        localStorage.setItem('tri_users', JSON.stringify(users));
    },
    
    getCurrentUser() {
        const userId = localStorage.getItem('tri_current_user');
        if (!userId) return null;
        const users = this.getUsers();
        return users.find(u => u.id === userId) || null;
    },
    
    setCurrentUser(user) {
        localStorage.setItem('tri_current_user', user.id);
    },
    
    logout() {
        localStorage.removeItem('tri_current_user');
    },
    
    // 打卡记录相关
    getCheckins() {
        return JSON.parse(localStorage.getItem('tri_checkins') || '[]');
    },
    
    saveCheckins(checkins) {
        localStorage.setItem('tri_checkins', JSON.stringify(checkins));
    },
    
    addCheckin(checkin) {
        const checkins = this.getCheckins();
        checkin.id = 'ck_' + Date.now();
        checkin.createdAt = new Date().toISOString();
        checkins.push(checkin);
        this.saveCheckins(checkins);
        return checkin;
    },
    
    updateCheckin(checkinId, updates) {
        const checkins = this.getCheckins();
        const index = checkins.findIndex(c => c.id === checkinId);
        if (index !== -1) {
            checkins[index] = { ...checkins[index], ...updates, updatedAt: new Date().toISOString() };
            this.saveCheckins(checkins);
            return checkins[index];
        }
        return null;
    },
    
    deleteCheckin(checkinId) {
        const checkins = this.getCheckins();
        const filtered = checkins.filter(c => c.id !== checkinId);
        this.saveCheckins(filtered);
    },
    
    // 目标相关
    getGoals(userId) {
        const goals = JSON.parse(localStorage.getItem('tri_goals') || '{}');
        return goals[userId] || { weekly: { swim: 0, bike: 0, run: 0 }, monthly: { swim: 0, bike: 0, run: 0 } };
    },
    
    saveGoals(userId, goals) {
        const allGoals = JSON.parse(localStorage.getItem('tri_goals') || '{}');
        allGoals[userId] = goals;
        localStorage.setItem('tri_goals', JSON.stringify(allGoals));
    },
    
    // 训练计划相关
    getPlans(userId) {
        const plans = JSON.parse(localStorage.getItem('tri_plans') || '{}');
        return plans[userId] || [];
    },
    
    savePlans(userId, plans) {
        const allPlans = JSON.parse(localStorage.getItem('tri_plans') || '{}');
        allPlans[userId] = plans;
        localStorage.setItem('tri_plans', JSON.stringify(allPlans));
    },
    
    addPlan(userId, plan) {
        const plans = this.getPlans(userId);
        plan.id = 'plan_' + Date.now();
        plan.createdAt = new Date().toISOString();
        plans.push(plan);
        this.savePlans(userId, plans);
        return plan;
    },
    
    updatePlan(userId, planId, updates) {
        const plans = this.getPlans(userId);
        const index = plans.findIndex(p => p.id === planId);
        if (index !== -1) {
            plans[index] = { ...plans[index], ...updates };
            this.savePlans(userId, plans);
            return plans[index];
        }
        return null;
    },
    
    deletePlan(userId, planId) {
        const plans = this.getPlans(userId);
        const filtered = plans.filter(p => p.id !== planId);
        this.savePlans(userId, filtered);
    },

    // 管理员：获取所有用户的计划
    getAllPlans() {
        return JSON.parse(localStorage.getItem('tri_plans') || '{}');
    },

    // 设置管理员
    setAdmin(userId) {
        const users = this.getUsers();
        const idx = users.findIndex(u => u.id === userId);
        if (idx !== -1) {
            users[idx].isAdmin = true;
            this.saveUsers(users);
            return users[idx]; // 返回更新后的用户对象
        }
        return null;
    },

    // 强制确保管理员身份（每次调用都检查，不依赖缓存）
    ensureAdmin(username) {
        const ADMIN_USERNAMES = ['eymozhao'];
        if (!ADMIN_USERNAMES.includes(username)) return false;
        const users = this.getUsers();
        const idx = users.findIndex(u => u.username === username);
        if (idx !== -1) {
            if (!users[idx].isAdmin) {
                users[idx].isAdmin = true;
                this.saveUsers(users);
            }
            return true;
        }
        return false;
    }
};

// ========== 工具函数 ==========
const Utils = {
    sportNames: {
        swim: '游泳',
        bike: '骑行',
        run: '跑步',
        other: '其他'
    },

    sportUnits: {
        swim: 'm',
        bike: 'km',
        run: 'km',
        other: null   // 其他不显示距离，显示训练内容
    },

    sportIcons: {
        swim: '🏊',
        bike: '🚴',
        run: '🏃',
        other: '💪'
    },

    // 格式化距离显示（游泳用m，其余km）
    formatDistance(sport, distance) {
        if (sport === 'other') return '';
        const unit = this.sportUnits[sport] || 'km';
        return `${distance}${unit}`;
    },

    // 打卡列表一行摘要
    checkinSummary(c) {
        if (c.sport === 'other') {
            const content = c.content || '其他训练';
            return `${content} · ${this.formatDuration(c.duration)}`;
        }
        return `${this.formatDistance(c.sport, c.distance)} · ${this.formatDuration(c.duration)}`;
    },
    
    // 将日期对象转为本地 YYYY-MM-DD 字符串，避免时区偏移问题
    toLocalDateStr(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    },
    
    formatDate(dateStr) {
        const today = this.toLocalDateStr(new Date());
        const yesterday = this.toLocalDateStr(new Date(Date.now() - 86400000));
        
        if (dateStr === today) return '今天';
        if (dateStr === yesterday) return '昨天';
        const parts = dateStr.split('-');
        return `${parseInt(parts[1])}月${parseInt(parts[2])}日`;
    },
    
    formatDateTime(isoStr) {
        const date = new Date(isoStr);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
        if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
        if (diff < 172800000) return '昨天';
        return `${date.getMonth() + 1}月${date.getDate()}日`;
    },
    
    formatDuration(minutes) {
        minutes = parseInt(minutes) || 0;
        if (minutes < 60) return `${minutes}分钟`;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return m > 0 ? `${h}小时${m}分钟` : `${h}小时`;
    },
    
    getWeekRange() {
        const now = new Date();
        const day = now.getDay();
        const diffToMon = (day === 0 ? -6 : 1 - day);
        const start = new Date(now);
        start.setDate(now.getDate() + diffToMon);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return {
            start: this.toLocalDateStr(start),
            end: this.toLocalDateStr(end)
        };
    },
    
    getMonthRange() {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
            start: this.toLocalDateStr(start),
            end: this.toLocalDateStr(end)
        };
    },
    
    getYearRange() {
        const year = new Date().getFullYear();
        return {
            start: `${year}-01-01`,
            end: `${year}-12-31`
        };
    },
    
    isInPeriod(dateStr, period) {
        let range;
        switch (period) {
            case 'week':  range = this.getWeekRange(); break;
            case 'month': range = this.getMonthRange(); break;
            case 'year':  range = this.getYearRange(); break;
            default: return true;
        }
        return dateStr >= range.start && dateStr <= range.end;
    },
    
    weekDayName(dateStr) {
        const days = ['周日','周一','周二','周三','周四','周五','周六'];
        return days[new Date(dateStr + 'T00:00:00').getDay()];
    },
    
    intensityLabel(level) {
        const map = { easy: '🟢 轻松', moderate: '🟡 中等', hard: '🔴 强度' };
        return map[level] || level;
    }
};

// ========== UI 组件 ==========
const UI = {
    showLoading() {
        document.body.style.opacity = '0.5';
    },
    
    hideLoading() {
        document.body.style.opacity = '1';
    },
    
    toast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'toast show ' + type;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    },
    
    renderEmptyState(container, message = '暂无数据') {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <div class="empty-text">${message}</div>
            </div>
        `;
    }
};

// ========== 应用主体 ==========
const App = {
    currentUser: null,
    currentSport: 'swim',
    currentGoalPeriod: 'weekly',
    currentStatsPeriod: 'week',
    currentRankPeriod: 'weekly',
    currentRankSport: 'total',
    feedFilter: 'all',
    planViewDate: null,   // 当前查看的计划日期

    init() {
        this.currentUser = DB.getCurrentUser();
        // 初始化计划日期为今天
        this.planViewDate = Utils.toLocalDateStr(new Date());

        // 自动将指定账号标记为管理员（刷新页面时也生效）
        if (this.currentUser) {
            if (DB.ensureAdmin(this.currentUser.username)) {
                this.currentUser = DB.getCurrentUser(); // 重新读取确保最新数据
            }
        }
        
        if (this.currentUser) {
            this.showMainPage();
        } else {
            this.showAuthPage();
        }
        
        this.bindEvents();
    },
    
    bindEvents() {
        // 登录/注册切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
                document.getElementById(tab + '-form').classList.add('active');
            });
        });
        
        // 登录
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        // 注册
        document.getElementById('register-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });
        
        // 退出
        document.getElementById('logout-btn').addEventListener('click', () => {
            DB.logout();
            this.currentUser = null;
            this.showAuthPage();
        });
        
        // 底部导航
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                this.switchSection(page);
            });
        });
        
        // 运动项目选择（打卡页）
        document.querySelectorAll('.sport-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.sport-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.currentSport = e.currentTarget.dataset.sport;
                this.updateCheckinFormFields(this.currentSport);
            });
        });

        // 初始化字段状态
        this.updateCheckinFormFields(this.currentSport);
        
        // 打卡日期默认今天
        const checkinDateEl = document.getElementById('checkin-date');
        if (checkinDateEl) checkinDateEl.value = Utils.toLocalDateStr(new Date());
        
        // 打卡提交
        document.getElementById('checkin-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCheckin();
        });
        
        // 目标周期切换
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentGoalPeriod = e.target.dataset.period;
                this.renderGoals();
            });
        });
        
        // 保存目标
        document.getElementById('save-goals-btn').addEventListener('click', () => {
            this.saveGoals();
        });
        
        // 统计周期选择
        document.getElementById('stats-period-select').addEventListener('change', (e) => {
            this.currentStatsPeriod = e.target.value;
            this.renderStats();
        });
        
        // 动态筛选
        document.getElementById('feed-sport-filter').addEventListener('change', (e) => {
            this.feedFilter = e.target.value;
            this.renderFeed();
        });
        
        // 排行榜周期
        document.querySelectorAll('.rank-period-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.rank-period-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentRankPeriod = e.target.dataset.period;
                this.renderRank();
            });
        });
        
        // 排行榜项目
        document.querySelectorAll('.rank-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.rank-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.currentRankSport = e.target.dataset.sport;
                this.renderRank();
            });
        });
        
        // 训练计划 - 日期导航
        document.getElementById('plan-prev-day').addEventListener('click', () => {
            const d = new Date(this.planViewDate);
            d.setDate(d.getDate() - 1);
            this.planViewDate = Utils.toLocalDateStr(d);
            this.renderPlans();
        });
        
        document.getElementById('plan-next-day').addEventListener('click', () => {
            const d = new Date(this.planViewDate);
            d.setDate(d.getDate() + 1);
            this.planViewDate = Utils.toLocalDateStr(d);
            this.renderPlans();
        });
        
        document.getElementById('plan-date-label').addEventListener('click', () => {
            this.planViewDate = Utils.toLocalDateStr(new Date());
            this.renderPlans();
        });
        
        // 训练计划 - 添加计划
        document.getElementById('add-plan-btn').addEventListener('click', () => {
            this.openPlanModal();
        });
        
        document.getElementById('plan-modal-close').addEventListener('click', () => {
            this.closePlanModal();
        });
        
        document.getElementById('plan-modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closePlanModal();
        });
        
        // 训练计划 modal中运动项目选择
        document.querySelectorAll('.plan-sport-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.plan-sport-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this._updatePlanModalFields(e.currentTarget.dataset.sport);
            });
        });
        
        document.getElementById('save-plan-btn').addEventListener('click', () => {
            this.savePlan();
        });
        
        // 打卡编辑 Modal
        document.getElementById('checkin-edit-modal-close').addEventListener('click', () => {
            this.closeCheckinEditModal();
        });
        
        document.getElementById('checkin-edit-modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeCheckinEditModal();
        });
        
        document.querySelectorAll('.edit-sport-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.edit-sport-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this._updateEditModalFields(e.currentTarget.dataset.sport);
            });
        });
        
        document.getElementById('save-checkin-edit-btn').addEventListener('click', () => {
            this.saveCheckinEdit();
        });
    },
    
    // ========== 登录注册 ==========
    showAuthPage() {
        document.getElementById('auth-page').classList.add('active');
        document.getElementById('main-page').classList.remove('active');
    },
    
    showMainPage() {
        document.getElementById('auth-page').classList.remove('active');
        document.getElementById('main-page').classList.add('active');
        const adminBadge = this.currentUser.isAdmin ? ' 👑' : '';
        document.getElementById('current-user').textContent = this.currentUser.nickname + adminBadge;
        // 重新设置打卡日期（防止首次加载时绑定早于DOM）
        const el = document.getElementById('checkin-date');
        if (el) el.value = Utils.toLocalDateStr(new Date());
        this.updateCheckinFormFields(this.currentSport);
        this.renderRecentCheckins();
        this.renderGoals();
        this.renderStats();
        this.renderFeed();
        this.renderRank();
        this.renderPlans();
    },
    
    handleLogin() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        
        if (!username || !password) {
            UI.toast('请填写完整信息', 'error');
            return;
        }
        
        const users = DB.getUsers();
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            // 自动将指定账号设为管理员
            DB.ensureAdmin(user.username);
            this.currentUser = DB.getCurrentUser(); // 重新读取确保 isAdmin 已更新
            UI.toast('登录成功！', 'success');
            this.showMainPage();
        } else {
            UI.toast('用户名或密码错误', 'error');
        }
    },
    
    handleRegister() {
        const username = document.getElementById('reg-username').value.trim();
        const nickname = document.getElementById('reg-nickname').value.trim();
        const password = document.getElementById('reg-password').value;
        
        if (username.length < 2) {
            UI.toast('用户名至少2个字符', 'error');
            return;
        }
        
        if (nickname.length < 1) {
            UI.toast('请输入昵称', 'error');
            return;
        }
        
        if (password.length < 4) {
            UI.toast('密码至少4个字符', 'error');
            return;
        }
        
        const users = DB.getUsers();
        
        if (users.find(u => u.username === username)) {
            UI.toast('用户名已存在', 'error');
            return;
        }
        
        const newUser = {
            id: 'user_' + Date.now(),
            username,
            nickname,
            password,
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        DB.saveUsers(users);
        
        this.currentUser = newUser;
        DB.setCurrentUser(newUser);
        UI.toast('注册成功！', 'success');
        this.showMainPage();
    },
    
    // ========== 页面切换 ==========
    switchSection(page) {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`.nav-tab[data-page="${page}"]`).classList.add('active');
        
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById(page + '-section').classList.add('active');
        
        switch (page) {
            case 'checkin': this.renderRecentCheckins(); break;
            case 'goals':   this.renderGoals(); break;
            case 'stats':   this.renderStats(); break;
            case 'feed':    this.renderFeed(); break;
            case 'rank':    this.renderRank(); break;
            case 'plan':    this.renderPlans(); break;
        }
    },
    
    // ========== 打卡功能 ==========
    handleCheckin() {
        const durationStr = document.getElementById('checkin-duration').value;
        const dateEl = document.getElementById('checkin-date');
        const date = dateEl ? dateEl.value : '';
        const duration = parseInt(durationStr);

        if (!durationStr || isNaN(duration) || duration <= 0) {
            UI.toast('请输入有效时长', 'error');
            return;
        }
        if (!date) {
            UI.toast('请选择日期', 'error');
            return;
        }

        let distance = 0;
        let content = '';

        if (this.currentSport === 'other') {
            content = document.getElementById('checkin-content').value.trim();
            if (!content) {
                UI.toast('请输入训练内容', 'error');
                return;
            }
        } else {
            const distanceStr = document.getElementById('checkin-distance').value;
            distance = parseFloat(distanceStr);
            if (!distanceStr || isNaN(distance) || distance <= 0) {
                UI.toast('请输入有效距离', 'error');
                return;
            }
        }

        const checkin = DB.addCheckin({
            userId: this.currentUser.id,
            nickname: this.currentUser.nickname,
            sport: this.currentSport,
            distance,
            content,
            duration,
            date
        });

        UI.toast('打卡成功！', 'success');

        // 重置表单
        document.getElementById('checkin-distance').value = '';
        document.getElementById('checkin-content').value = '';
        document.getElementById('checkin-duration').value = '';
        if (dateEl) dateEl.value = Utils.toLocalDateStr(new Date());

        this.renderRecentCheckins();
        this.renderPlans();
    },

    // 根据选中运动项目切换距离/内容字段
    updateCheckinFormFields(sport) {
        const distGroup = document.getElementById('checkin-distance-group');
        const contentGroup = document.getElementById('checkin-content-group');
        const distLabel = document.querySelector('label[for="checkin-distance"]');
        if (sport === 'other') {
            distGroup.style.display = 'none';
            contentGroup.style.display = 'block';
        } else {
            distGroup.style.display = 'block';
            contentGroup.style.display = 'none';
            if (distLabel) {
                distLabel.textContent = sport === 'swim' ? '距离 (m)' : '距离 (km)';
            }
        }
    },
    
    renderRecentCheckins() {
        const checkins = DB.getCheckins()
            .filter(c => c.userId === this.currentUser.id)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);
        
        const container = document.getElementById('recent-list');
        
        if (checkins.length === 0) {
            UI.renderEmptyState(container, '还没有打卡记录');
            return;
        }
        
        container.innerHTML = checkins.map(c => `
            <div class="checkin-item">
                <span class="checkin-sport">${Utils.sportIcons[c.sport]}</span>
                <div class="checkin-info">
                    <div class="checkin-distance">${Utils.checkinSummary(c)}</div>
                    <div class="checkin-meta">${Utils.sportNames[c.sport]} · ${Utils.formatDate(c.date)}</div>
                </div>
                <div class="checkin-item-actions">
                    <button class="btn-icon" title="修改" onclick="App.openCheckinEditModal('${c.id}')">✏️</button>
                    <button class="btn-icon" title="删除" onclick="App.deleteCheckinConfirm('${c.id}')">🗑️</button>
                </div>
            </div>
        `).join('');
    },
    
    // ========== 目标功能 ==========
    renderGoals() {
        const goals = DB.getGoals(this.currentUser.id);
        const currentGoals = goals[this.currentGoalPeriod];
        
        // 计算完成进度
        const checkins = DB.getCheckins().filter(c => c.userId === this.currentUser.id);
        const period = this.currentGoalPeriod === 'weekly' ? 'week' : 'month';
        
        const progress = { swim: 0, bike: 0, run: 0 };
        checkins.forEach(c => {
            if (Utils.isInPeriod(c.date, period) && c.sport !== 'other') {
                if (progress[c.sport] !== undefined) progress[c.sport] += c.distance;
            }
        });
        
        const container = document.getElementById('goals-container');
        container.innerHTML = ['swim', 'bike', 'run'].map(sport => {
            const goal = currentGoals[sport] || 0;
            const done = progress[sport];
            const unit = Utils.sportUnits[sport];
            const percent = goal > 0 ? Math.min(100, (done / goal) * 100) : 0;
            
            return `
                <div class="goal-card">
                    <div class="goal-header">
                        <span class="goal-title">${Utils.sportIcons[sport]} ${Utils.sportNames[sport]}</span>
                        <span class="goal-value">目标: ${goal} ${unit}</span>
                    </div>
                    <div class="goal-progress">
                        <div class="goal-progress-bar ${sport}" style="width: ${percent}%"></div>
                    </div>
                    <div class="goal-stats">
                        <span>已完成: ${done.toFixed(1)} ${unit}</span>
                        <span>${percent.toFixed(0)}%</span>
                    </div>
                </div>
            `;
        }).join('');
        
        // 填充表单
        document.getElementById('goal-swim').value = currentGoals.swim || '';
        document.getElementById('goal-bike').value = currentGoals.bike || '';
        document.getElementById('goal-run').value = currentGoals.run || '';
    },
    
    saveGoals() {
        const goals = DB.getGoals(this.currentUser.id);
        goals[this.currentGoalPeriod] = {
            swim: parseFloat(document.getElementById('goal-swim').value) || 0,
            bike: parseFloat(document.getElementById('goal-bike').value) || 0,
            run: parseFloat(document.getElementById('goal-run').value) || 0
        };
        DB.saveGoals(this.currentUser.id, goals);
        UI.toast('目标已保存！', 'success');
        this.renderGoals();
    },
    
    // ========== 统计功能 ==========
    renderStats() {
        const checkins = DB.getCheckins().filter(c => c.userId === this.currentUser.id);
        
        let periodCheckins;
        switch (this.currentStatsPeriod) {
            case 'week':
                periodCheckins = checkins.filter(c => Utils.isInPeriod(c.date, 'week'));
                break;
            case 'month':
                periodCheckins = checkins.filter(c => Utils.isInPeriod(c.date, 'month'));
                break;
            case 'year':
                periodCheckins = checkins.filter(c => Utils.isInPeriod(c.date, 'year'));
                break;
            default:
                periodCheckins = checkins;
        }
        
        const stats = {
            swim:  { distance: 0, duration: 0 },
            bike:  { distance: 0, duration: 0 },
            run:   { distance: 0, duration: 0 },
            other: { count: 0,    duration: 0 }
        };
        periodCheckins.forEach(c => {
            if (c.sport === 'other') {
                stats.other.count++;
                stats.other.duration += c.duration;
            } else if (stats[c.sport]) {
                stats[c.sport].distance += c.distance;
                stats[c.sport].duration += c.duration;
            }
        });
        
        const summaryContainer = document.getElementById('stats-summary');
        summaryContainer.innerHTML = `
            <div class="stat-card swim">
                <div class="stat-icon">🏊</div>
                <div class="stat-distance">${stats.swim.distance.toFixed(0)}</div>
                <div class="stat-unit">m</div>
                <div class="stat-duration">${Utils.formatDuration(stats.swim.duration)}</div>
            </div>
            <div class="stat-card bike">
                <div class="stat-icon">🚴</div>
                <div class="stat-distance">${stats.bike.distance.toFixed(1)}</div>
                <div class="stat-unit">km</div>
                <div class="stat-duration">${Utils.formatDuration(stats.bike.duration)}</div>
            </div>
            <div class="stat-card run">
                <div class="stat-icon">🏃</div>
                <div class="stat-distance">${stats.run.distance.toFixed(1)}</div>
                <div class="stat-unit">km</div>
                <div class="stat-duration">${Utils.formatDuration(stats.run.duration)}</div>
            </div>
            <div class="stat-card other">
                <div class="stat-icon">💪</div>
                <div class="stat-distance">${stats.other.count}</div>
                <div class="stat-unit">次</div>
                <div class="stat-duration">${Utils.formatDuration(stats.other.duration)}</div>
            </div>
        `;
        
        // 历史记录
        const historyContainer = document.getElementById('history-list');
        const sortedCheckins = checkins.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);
        
        if (sortedCheckins.length === 0) {
            UI.renderEmptyState(historyContainer, '暂无记录');
            return;
        }
        
        historyContainer.innerHTML = sortedCheckins.map(c => `
            <div class="checkin-item">
                <span class="checkin-sport">${Utils.sportIcons[c.sport]}</span>
                <div class="checkin-info">
                    <div class="checkin-distance">${Utils.checkinSummary(c)}</div>
                    <div class="checkin-meta">${Utils.sportNames[c.sport]} · ${Utils.formatDate(c.date)}</div>
                </div>
                <div class="checkin-item-actions">
                    <button class="btn-icon" title="修改" onclick="App.openCheckinEditModal('${c.id}')">✏️</button>
                    <button class="btn-icon" title="删除" onclick="App.deleteCheckinConfirm('${c.id}')">🗑️</button>
                </div>
            </div>
        `).join('');

        // 管理员：渲染全队统计表格
        const teamSection = document.getElementById('team-stats-section');
        if (this.currentUser.isAdmin) {
            teamSection.style.display = 'block';
            this.renderTeamStats();
        } else {
            teamSection.style.display = 'none';
        }
    },

    renderTeamStats() {
        const allCheckins = DB.getCheckins();
        const users = DB.getUsers();
        const period = this.currentStatsPeriod;

        // 过滤时间段
        let filtered;
        switch (period) {
            case 'week':  filtered = allCheckins.filter(c => Utils.isInPeriod(c.date, 'week'));  break;
            case 'month': filtered = allCheckins.filter(c => Utils.isInPeriod(c.date, 'month')); break;
            case 'year':  filtered = allCheckins.filter(c => Utils.isInPeriod(c.date, 'year'));  break;
            default:      filtered = allCheckins;
        }

        const periodLabel = { week: '本周', month: '本月', year: '本年', all: '全部' };

        // 按用户汇总
        const userMap = {};
        users.forEach(u => {
            userMap[u.id] = { nickname: u.nickname, swim: 0, swimDur: 0, bike: 0, bikeDur: 0, run: 0, runDur: 0, other: 0, otherDur: 0, count: 0 };
        });
        filtered.forEach(c => {
            const u = userMap[c.userId];
            if (!u) return;
            u.count++;
            if (c.sport === 'swim')       { u.swim += c.distance; u.swimDur += c.duration; }
            else if (c.sport === 'bike')  { u.bike += c.distance; u.bikeDur += c.duration; }
            else if (c.sport === 'run')   { u.run  += c.distance; u.runDur  += c.duration; }
            else if (c.sport === 'other') { u.other++;            u.otherDur += c.duration; }
        });

        // 只显示有打卡记录的用户
        const rows = Object.values(userMap).filter(u =>
            u.swim > 0 || u.bike > 0 || u.run > 0 || u.other > 0
        );

        const container = document.getElementById('team-stats-table');
        if (rows.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">暂无团队数据</div></div>';
            return;
        }

        container.innerHTML = `
            <div style="text-align:right;font-size:12px;color:var(--text-light);margin-bottom:8px;">📅 ${periodLabel[period] || ''}统计</div>
            <div class="team-table-wrap">
                <table class="team-table">
                    <thead>
                        <tr>
                            <th>成员</th>
                            <th>🏊 游泳</th>
                            <th>🚴 骑行</th>
                            <th>🏃 跑步</th>
                            <th>💪 其他</th>
                            <th>打卡次数</th>
                            <th>总时长</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(u => {
                            const totalDur = u.swimDur + u.bikeDur + u.runDur + u.otherDur;
                            const totalKm = (u.swim / 1000 + u.bike + u.run).toFixed(1);
                            return `
                            <tr>
                                <td class="team-name">${u.nickname}</td>
                                <td>${u.swim > 0 ? u.swim.toFixed(0) + 'm' : '-'}<br><small>${u.swim > 0 ? Utils.formatDuration(u.swimDur) : ''}</small></td>
                                <td>${u.bike > 0 ? u.bike.toFixed(1) + 'km' : '-'}<br><small>${u.bike > 0 ? Utils.formatDuration(u.bikeDur) : ''}</small></td>
                                <td>${u.run > 0  ? u.run.toFixed(1)  + 'km' : '-'}<br><small>${u.run > 0  ? Utils.formatDuration(u.runDur)  : ''}</small></td>
                                <td>${u.other > 0 ? u.other + '次' : '-'}<br><small>${u.other > 0 ? Utils.formatDuration(u.otherDur) : ''}</small></td>
                                <td class="team-total">${u.count}次<br><small>${totalKm}km</small></td>
                                <td>${Utils.formatDuration(totalDur)}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },
    
    // ========== 动态流 ==========
    renderFeed() {
        let checkins = DB.getCheckins()
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        if (this.feedFilter !== 'all') {
            checkins = checkins.filter(c => c.sport === this.feedFilter);
        }
        
        const container = document.getElementById('feed-list');
        
        if (checkins.length === 0) {
            UI.renderEmptyState(container, '还没有人打卡');
            return;
        }
        
        container.innerHTML = checkins.map(c => `
            <div class="feed-item">
                <div class="feed-header">
                    <span class="feed-user">${c.nickname}</span>
                    <span class="feed-time">${Utils.formatDateTime(c.createdAt)}</span>
                </div>
                <div class="feed-content">
                    <span class="feed-sport">${Utils.sportIcons[c.sport]}</span>
                    <div class="feed-details">
                        <div class="feed-distance">${c.sport === 'other' ? (c.content || '其他训练') : Utils.formatDistance(c.sport, c.distance)}</div>
                        <div class="feed-duration">${Utils.formatDuration(c.duration)} · ${Utils.sportNames[c.sport]}</div>
                    </div>
                </div>
            </div>
        `).join('');
    },
    
    // ========== 排行榜 ==========
    renderRank() {
        const checkins = DB.getCheckins();
        const periodMap = { 'weekly': 'week', 'monthly': 'month', 'yearly': 'year' };
        const period = periodMap[this.currentRankPeriod] || 'week';
        
        const periodCheckins = checkins.filter(c => Utils.isInPeriod(c.date, period));
        
        // 按用户统计
        const userStats = {};
        periodCheckins.forEach(c => {
            if (!userStats[c.userId]) {
                userStats[c.userId] = { nickname: c.nickname, swim: 0, bike: 0, run: 0, other: 0, total: 0 };
            }
            if (c.sport === 'other') {
                userStats[c.userId].other += 1;
            } else if (userStats[c.userId][c.sport] !== undefined) {
                userStats[c.userId][c.sport] += c.distance;
                userStats[c.userId].total += c.sport === 'swim' ? c.distance / 1000 : c.distance;
            }
        });
        
        const isOtherTab = this.currentRankSport === 'other';
        const sortKey = this.currentRankSport === 'total' ? 'total' : this.currentRankSport;

        let entries = Object.entries(userStats).map(([userId, stats]) => ({ userId, ...stats }));
        if (isOtherTab) {
            entries = entries.filter(e => e.other > 0);
        } else if (this.currentRankSport !== 'total') {
            entries = entries.filter(e => e[sortKey] > 0);
        }
        const sorted = entries.sort((a, b) => b[sortKey] - a[sortKey]);
        
        const container = document.getElementById('rank-list');
        
        if (sorted.length === 0) {
            UI.renderEmptyState(container, '暂无数据');
            return;
        }

        const sportLabel = { swim: '游泳', bike: '骑行', run: '跑步', other: '次数', total: '总里程' };
        const periodLabel = { weekly: '本周', monthly: '本月', yearly: '本年' };
        
        container.innerHTML = `
            <div class="rank-table-wrap">
                <table class="rank-table">
                    <thead>
                        <tr>
                            <th>排名</th>
                            <th>成员</th>
                            <th>${sportLabel[this.currentRankSport] || '总里程'}</th>
                            <th>运动次数</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sorted.map((item, index) => {
                            const isMe = item.userId === this.currentUser.id;
                            let displayVal, displayUnit;
                            if (this.currentRankSport === 'swim') {
                                displayVal = item.swim.toFixed(0); displayUnit = 'm';
                            } else if (this.currentRankSport === 'total') {
                                displayVal = item.total.toFixed(1); displayUnit = 'km';
                            } else if (this.currentRankSport === 'other') {
                                displayVal = item.other; displayUnit = '次';
                            } else {
                                displayVal = item[sortKey].toFixed(1); displayUnit = 'km';
                            }
                            // 统计该用户在这个period内的打卡次数
                            const userCheckins = periodCheckins.filter(c => c.userId === item.userId);
                            return `
                            <tr class="${isMe ? 'rank-me' : ''}">
                                <td class="rank-pos">${index < 3 ? ['🥇','🥈','🥉'][index] : (index + 1)}</td>
                                <td class="rank-name">${item.nickname}${isMe ? ' ⭐' : ''}</td>
                                <td class="rank-val">${displayVal} ${displayUnit}</td>
                                <td>${userCheckins.length}次</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            <div style="text-align:center;font-size:12px;color:var(--text-light);margin-top:8px;">
                📅 ${periodLabel[this.currentRankPeriod] || ''}数据统计
            </div>
        `;
    },
    
    // ========== 训练计划功能 ==========
    renderPlans() {
        const container = document.getElementById('plans-list');
        const dateLabel = document.getElementById('plan-date-label');
        if (dateLabel) {
            const d = new Date(this.planViewDate + 'T00:00:00');
            const weekDay = Utils.weekDayName(this.planViewDate);
            const today = Utils.toLocalDateStr(new Date());
            dateLabel.textContent = today === this.planViewDate
                ? `今天 ${weekDay}`
                : `${d.getMonth() + 1}月${d.getDate()}日 ${weekDay}`;
        }

        const isAdmin = this.currentUser.isAdmin;
        const users = DB.getUsers();

        if (isAdmin) {
            // 管理员：表格展示所有用户当天计划
            const allPlans = DB.getAllPlans();
            const allCheckins = DB.getCheckins().filter(c => c.date === this.planViewDate);

            // 收集所有有计划的用户行
            const tableRows = [];
            users.forEach(u => {
                const uPlans = (allPlans[u.id] || []).filter(p => p.date === this.planViewDate);
                const uCheckins = allCheckins.filter(c => c.userId === u.id);
                tableRows.push({ user: u, plans: uPlans, checkins: uCheckins });
            });

            const hasAny = tableRows.some(r => r.plans.length > 0);
            if (!hasAny) {
                UI.renderEmptyState(container, '今日无人安排训练计划');
            } else {
                container.innerHTML = this._renderAdminPlanTable(tableRows);
            }
        } else {
            // 普通用户：只看自己
            const plans = DB.getPlans(this.currentUser.id).filter(p => p.date === this.planViewDate);
            const checkins = DB.getCheckins()
                .filter(c => c.userId === this.currentUser.id && c.date === this.planViewDate);

            if (plans.length === 0) {
                UI.renderEmptyState(container, '暂无训练计划，点击右下角添加');
                return;
            }
            container.innerHTML = plans.map(p => this._renderPlanItem(p, checkins, true)).join('');
        }
    },

    _renderAdminPlanTable(tableRows) {
        // 只显示有计划的行
        const activeRows = tableRows.filter(r => r.plans.length > 0);
        let html = `
            <div class="team-table-wrap">
                <table class="team-table plan-table">
                    <thead>
                        <tr>
                            <th>成员</th>
                            <th>计划项目</th>
                            <th>计划内容</th>
                            <th>状态</th>
                        </tr>
                    </thead>
                    <tbody>`;

        activeRows.forEach(({ user, plans, checkins }) => {
            plans.forEach((p, idx) => {
                const isOther = p.sport === 'other';
                const unit = Utils.sportUnits[p.sport] || 'km';
                let planDesc, isDone;

                if (isOther) {
                    planDesc = `${Utils.formatDuration(p.plannedDuration)}`;
                    isDone = checkins.some(c => c.sport === 'other');
                } else {
                    const doneDist = checkins.filter(c => c.sport === p.sport).reduce((s, c) => s + c.distance, 0);
                    planDesc = `${p.plannedDistance}${unit} · ${Utils.formatDuration(p.plannedDuration)}`;
                    isDone = p.plannedDistance > 0 && doneDist >= p.plannedDistance;
                }

                const statusBadge = isDone
                    ? '<span class="plan-badge done">✅ 完成</span>'
                    : '<span class="plan-badge pending">⏳ 未完成</span>';

                html += `<tr class="${isDone ? 'plan-row-done' : ''}">
                    <td class="team-name">${idx === 0 ? user.nickname : ''}</td>
                    <td>${Utils.sportIcons[p.sport]} ${p.title || Utils.sportNames[p.sport]}</td>
                    <td>${planDesc}${p.note ? '<br><small class="plan-note-sm">' + p.note + '</small>' : ''}</td>
                    <td>${statusBadge}</td>
                </tr>`;
            });
        });

        html += `</tbody></table></div>`;
        return html;
    },

    _renderPlanItem(p, checkins, showActions) {
        const done = checkins.filter(c => c.sport === p.sport);
        const isOther = p.sport === 'other';
        const unit = Utils.sportUnits[p.sport] || 'km';

        // 「其他」类型：按完成次数判断完成状态
        let isCompleted, progressHtml, planDetailHtml;
        if (isOther) {
            isCompleted = done.length > 0;
            planDetailHtml = `计划: ${p.plannedDuration ? Utils.formatDuration(p.plannedDuration) : ''}${p.note ? '' : ''}`;
            progressHtml = `
                <div class="plan-progress-row">
                    <span class="plan-progress-text">${isCompleted ? '✅ 已打卡 ' + done.length + ' 次' : '未打卡'}</span>
                </div>`;
        } else {
            const doneDist = done.reduce((s, c) => s + c.distance, 0);
            isCompleted = p.plannedDistance > 0 && doneDist >= p.plannedDistance;
            planDetailHtml = `计划: ${p.plannedDistance} ${unit} · ${Utils.formatDuration(p.plannedDuration)}`;
            progressHtml = `
                <div class="plan-progress-row">
                    <div class="plan-progress">
                        <div class="plan-progress-bar" style="width: ${Math.min(100, (doneDist / (p.plannedDistance || 1)) * 100)}%"></div>
                    </div>
                    <span class="plan-progress-text">${doneDist.toFixed(p.sport === 'swim' ? 0 : 1)} / ${p.plannedDistance} ${unit}</span>
                </div>`;
        }

        const actionsHtml = showActions ? `
            <div class="plan-actions">
                <button class="btn-icon" onclick="App.editPlan('${p.id}')">✏️</button>
                <button class="btn-icon" onclick="App.deletePlanConfirm('${p.id}')">🗑️</button>
            </div>` : '';

        return `
            <div class="plan-item ${isCompleted ? 'completed' : ''}" data-id="${p.id}">
                <div class="plan-header">
                    <span class="plan-sport-icon">${Utils.sportIcons[p.sport]}</span>
                    <span class="plan-title">${p.title || Utils.sportNames[p.sport]}</span>
                    <span class="plan-status">${isCompleted ? '✅ 已完成' : '⏳ 进行中'}</span>
                </div>
                <div class="plan-body">
                    <div class="plan-detail">${planDetailHtml}</div>
                    ${p.intensity ? `<div class="plan-detail">${Utils.intensityLabel(p.intensity)}</div>` : ''}
                    ${p.note ? `<div class="plan-note">${p.note}</div>` : ''}
                    ${progressHtml}
                </div>
                ${actionsHtml}
            </div>
        `;
    },
    
    openPlanModal(plan = null) {
        document.getElementById('plan-modal-overlay').classList.add('open');
        const form = document.getElementById('plan-form');
        if (plan) {
            document.getElementById('plan-id').value = plan.id;
            document.querySelectorAll('.plan-sport-btn').forEach(b => b.classList.remove('active'));
            document.querySelector(`.plan-sport-btn[data-sport="${plan.sport}"]`).classList.add('active');
            this._updatePlanModalFields(plan.sport);
            document.getElementById('plan-title').value = plan.title || '';
            document.getElementById('plan-distance').value = plan.plannedDistance || '';
            document.getElementById('plan-duration').value = plan.plannedDuration || '';
            document.getElementById('plan-intensity').value = plan.intensity || '';
            document.getElementById('plan-note').value = plan.note || '';
            document.getElementById('modal-title').textContent = '编辑训练计划';
        } else {
            document.getElementById('plan-id').value = '';
            document.querySelectorAll('.plan-sport-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('.plan-sport-btn[data-sport="swim"]').classList.add('active');
            this._updatePlanModalFields('swim');
            document.getElementById('plan-title').value = '';
            document.getElementById('plan-distance').value = '';
            document.getElementById('plan-duration').value = '';
            document.getElementById('plan-intensity').value = 'moderate';
            document.getElementById('plan-note').value = '';
            document.getElementById('modal-title').textContent = '添加训练计划';
        }
    },

    _updatePlanModalFields(sport) {
        const distGroup = document.getElementById('plan-distance-group');
        const distLabel = document.querySelector('label[for="plan-distance"]');
        if (sport === 'other') {
            if (distGroup) distGroup.style.display = 'none';
        } else {
            if (distGroup) distGroup.style.display = 'block';
            if (distLabel) distLabel.textContent = sport === 'swim' ? '计划距离 (m)' : '计划距离 (km)';
        }
    },
    
    closePlanModal() {
        document.getElementById('plan-modal-overlay').classList.remove('open');
    },
    
    savePlan() {
        const id = document.getElementById('plan-id').value;
        const sportBtn = document.querySelector('.plan-sport-btn.active');
        const sport = sportBtn ? sportBtn.dataset.sport : 'swim';
        const title = document.getElementById('plan-title').value.trim();
        const distance = parseFloat(document.getElementById('plan-distance').value) || 0;
        const duration = parseInt(document.getElementById('plan-duration').value) || 0;
        const intensity = document.getElementById('plan-intensity').value;
        const note = document.getElementById('plan-note').value.trim();
        
        if (sport !== 'other' && !distance && !duration) {
            UI.toast('请输入计划距离或时长', 'error');
            return;
        }
        if (sport === 'other' && !duration) {
            UI.toast('请输入计划时长', 'error');
            return;
        }
        
        if (id) {
            DB.updatePlan(this.currentUser.id, id, { sport, title, plannedDistance: distance, plannedDuration: duration, intensity, note });
            UI.toast('计划已更新', 'success');
        } else {
            DB.addPlan(this.currentUser.id, { sport, title, plannedDistance: distance, plannedDuration: duration, intensity, note, date: this.planViewDate });
            UI.toast('计划已添加', 'success');
        }
        this.closePlanModal();
        this.renderPlans();
    },
    
    editPlan(planId) {
        const plans = DB.getPlans(this.currentUser.id);
        const plan = plans.find(p => p.id === planId);
        if (plan) this.openPlanModal(plan);
    },
    
    deletePlanConfirm(planId) {
        if (confirm('确定删除这条训练计划？')) {
            DB.deletePlan(this.currentUser.id, planId);
            UI.toast('已删除', 'success');
            this.renderPlans();
        }
    },
    
    // ========== 打卡修改功能 ==========
    openCheckinEditModal(checkinId) {
        const checkins = DB.getCheckins();
        const c = checkins.find(item => item.id === checkinId);
        if (!c) return;

        document.getElementById('edit-checkin-id').value = c.id;

        // 设置运动项目
        document.querySelectorAll('.edit-sport-btn').forEach(b => b.classList.remove('active'));
        const sportBtn = document.querySelector(`.edit-sport-btn[data-sport="${c.sport}"]`);
        if (sportBtn) sportBtn.classList.add('active');

        this._updateEditModalFields(c.sport);

        document.getElementById('edit-checkin-distance').value = c.distance || '';
        document.getElementById('edit-checkin-content').value = c.content || '';
        document.getElementById('edit-checkin-duration').value = c.duration;
        document.getElementById('edit-checkin-date').value = c.date;

        document.getElementById('checkin-edit-modal-overlay').classList.add('open');
    },

    _updateEditModalFields(sport) {
        const distGroup = document.getElementById('edit-distance-group');
        const contentGroup = document.getElementById('edit-content-group');
        const distLabel = document.querySelector('label[for="edit-checkin-distance"]');
        if (sport === 'other') {
            if (distGroup) distGroup.style.display = 'none';
            if (contentGroup) contentGroup.style.display = 'block';
        } else {
            if (distGroup) distGroup.style.display = 'block';
            if (contentGroup) contentGroup.style.display = 'none';
            if (distLabel) distLabel.textContent = sport === 'swim' ? '距离 (m)' : '距离 (km)';
        }
    },
    
    closeCheckinEditModal() {
        document.getElementById('checkin-edit-modal-overlay').classList.remove('open');
    },
    
    saveCheckinEdit() {
        const id = document.getElementById('edit-checkin-id').value;
        if (!id) return;

        const sportBtn = document.querySelector('.edit-sport-btn.active');
        const sport = sportBtn ? sportBtn.dataset.sport : 'swim';
        const durationStr = document.getElementById('edit-checkin-duration').value;
        const date = document.getElementById('edit-checkin-date').value;
        const duration = parseInt(durationStr);

        if (!durationStr || isNaN(duration) || duration <= 0) {
            UI.toast('请输入有效时长', 'error');
            return;
        }
        if (!date) {
            UI.toast('请选择日期', 'error');
            return;
        }

        let distance = 0;
        let content = '';
        if (sport === 'other') {
            content = document.getElementById('edit-checkin-content').value.trim();
            if (!content) { UI.toast('请输入训练内容', 'error'); return; }
        } else {
            const distanceStr = document.getElementById('edit-checkin-distance').value;
            distance = parseFloat(distanceStr);
            if (!distanceStr || isNaN(distance) || distance <= 0) {
                UI.toast('请输入有效距离', 'error');
                return;
            }
        }

        DB.updateCheckin(id, { sport, distance, content, duration, date });
        UI.toast('打卡记录已更新 ✅', 'success');
        this.closeCheckinEditModal();
        this.renderRecentCheckins();
        this.renderStats();
        this.renderGoals();
        this.renderPlans();
        this.renderFeed();
        this.renderRank();
    },
    
    deleteCheckinConfirm(checkinId) {
        if (confirm('确定删除这条打卡记录？删除后无法恢复。')) {
            DB.deleteCheckin(checkinId);
            UI.toast('打卡记录已删除', 'success');
            this.renderRecentCheckins();
            this.renderStats();
            this.renderGoals();
            this.renderPlans();
            this.renderFeed();
            this.renderRank();
        }
    }
};

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});