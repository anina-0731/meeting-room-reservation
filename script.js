// 全局映射配置
const ROOM_MAP = {
    'need_book': { name: '⚠️待预定', class: 'tag-need_book', bgVar: '--color-need-book' },
    '23_meet': { name: '23F 会议室', class: 'tag-23_meet', bgVar: '--color-23-meet' },
    '23_chat': { name: '23F 洽谈室', class: 'tag-23_chat', bgVar: '--color-23-chat' },
    '27_meet': { name: '27F 会议室', class: 'tag-27_meet', bgVar: '--color-27-meet' },
    '27_chat': { name: '27F 洽谈室', class: 'tag-27_chat', bgVar: '--color-27-chat' },
    '32_road': { name: '32F 路演厅', class: 'tag-32_road', bgVar: '--color-32-road' }
};

// 状态初始化：打开页面自动定位到当前系统所在月份
let currentDate = new Date();
let bookings = JSON.parse(localStorage.getItem('ipro_bookings')) || [];

document.addEventListener('DOMContentLoaded', () => {
    // 自动将录入表单的默认日期设为今天
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    renderCalendar();
});

// 处理用途切换
function toggleCustomPurpose(value) {
    const group = document.getElementById('customPurposeGroup');
    const input = document.getElementById('customPurpose');
    if (value === 'CUSTOM') {
        group.style.display = 'block';
        input.required = true;
    } else {
        group.style.display = 'none';
        input.required = false;
    }
}

// 核心日历渲染机制
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 渲染标题
    document.getElementById('calendarTitle').innerText = `${year}年 ${(month + 1).toString().padStart(2, '0')}月`;

    const daysGrid = document.getElementById('daysGrid');
    daysGrid.innerHTML = '';

    // 日期边界计算
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevTotalDays = new Date(year, month, 0).getDate();

    // 1. 上月残余格子
    for (let i = firstDayIndex - 1; i >= 0; i--) {
        const dayNum = prevTotalDays - i;
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const dateStr = `${prevYear}-${(prevMonth + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
        daysGrid.appendChild(createDayCell(dayNum, dateStr, true));
    }

    // 2. 本月核心网格
    const todayObj = new Date();
    for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const isToday = todayObj.getFullYear() === year && todayObj.getMonth() === month && todayObj.getDate() === day;
        daysGrid.appendChild(createDayCell(day, dateStr, false, isToday));
    }

    // 3. 下月填充格子 (确保补满6行 42 个网格)
    const totalRendered = firstDayIndex + totalDays;
    const nextMonthNeed = 42 - totalRendered;
    for (let day = 1; day <= nextMonthNeed; day++) {
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        const dateStr = `${nextYear}-${(nextMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        daysGrid.appendChild(createDayCell(day, dateStr, true));
    }
}

// 构建单日格子DOM元素
function createDayCell(dayNum, dateStr, isOtherMonth, isToday = false) {
    const cell = document.createElement('div');
    cell.className = `day-cell ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`;
    
    // 双击触发弹窗查看详情
    cell.addEventListener('dblclick', () => openModal(dateStr));
    // 单击亦可调出视图
    cell.addEventListener('click', () => openModal(dateStr));

    const numberDiv = document.createElement('div');
    numberDiv.className = 'day-number';
    numberDiv.innerHTML = `${dayNum}`;
    cell.appendChild(numberDiv);

    const eventsContainer = document.createElement('div');
    eventsContainer.className = 'cell-events-container';

    // 抓取并按时间严格升序排列当日事项
    const dayBookings = bookings
        .filter(b => b.date === dateStr)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (dayBookings.length > 0) {
        // 核心染色逻辑：
        // 1. 如果其中任何一项属于“需要预定”，则全格子底色强行亮起淡红色
        const hasNeedBook = dayBookings.some(b => b.room === 'need_book');
        
        if (hasNeedBook) {
            cell.classList.add('status-need-book');
        } else {
            // 2. 如果全都已锁定房间，则获取当天第一个（即最早发生的）会议房间类型对应的颜色，并填充格子底色
            const firstRoomType = dayBookings[0].room;
            const roomConfig = ROOM_MAP[firstRoomType];
            if (roomConfig) {
                cell.style.backgroundColor = `var(${roomConfig.bgVar})`;
            }
        }

        // 纵向渲染出微型事件彩条标签
        dayBookings.forEach(book => {
            const tag = document.createElement('div');
            const roomInfo = ROOM_MAP[book.room] || ROOM_MAP['need_book'];
            tag.className = `event-tag ${roomInfo.class}`;
            tag.innerText = `${book.startTime} ${roomInfo.name}-${book.purpose}`;
            tag.title = `时间: ${book.startTime}-${book.endTime}\n房间: ${roomInfo.name}\n用途: ${book.purpose}`;
            eventsContainer.appendChild(tag);
        });
    }

    cell.appendChild(eventsContainer);
    return cell;
}

// 头部导航切月逻辑
function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    renderCalendar();
}

function toToday() {
    currentDate = new Date();
    renderCalendar();
}

// 监听预定表单提交
document.getElementById('bookingForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const date = document.getElementById('date').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const room = document.getElementById('room').value;
    const purposeSelect = document.getElementById('purposeSelect').value;
    
    let purpose = purposeSelect;
    if (purposeSelect === 'CUSTOM') {
        purpose = document.getElementById('customPurpose').value.trim();
        if (!purpose) return alert('请输入自定义用途名称！');
    }

    const memo = document.getElementById('memo').value.trim();

    if (startTime >= endTime) {
        alert('提交失败：结束时间必须晚于开始时间！');
        return;
    }

    const newRecord = {
        id: Date.now().toString(), // 保证ID唯一
        date,
        startTime,
        endTime,
        room,
        purpose,
        memo
    };

    bookings.push(newRecord);
    localStorage.setItem('ipro_bookings', JSON.stringify(bookings));

    alert('记录成功保存！');
    
    // 重置自定义业务输入框状态
    document.getElementById('memo').value = '';
    if (purposeSelect === 'CUSTOM') {
        document.getElementById('bookingForm').reset();
        document.getElementById('date').value = date;
        toggleCustomPurpose('');
    }

    renderCalendar();
});

// 打开单日多项业务清单弹窗
function openModal(dateStr) {
    document.getElementById('modalDateTitle').innerText = `${dateStr} 场地排班与预定清单`;
    const body = document.getElementById('modalBody');
    body.innerHTML = '';

    const dayBookings = bookings
        .filter(b => b.date === dateStr)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (dayBookings.length === 0) {
        body.innerHTML = '<div class="no-data">当天无任何会议室使用或待预定记录。</div>';
    } else {
        dayBookings.forEach(b => {
            const roomInfo = ROOM_MAP[b.room] || ROOM_MAP['need_book'];
            const item = document.createElement('div');
            item.className = 'detail-item';
            item.innerHTML = `
                <div class="detail-item-time">⏰ 时间段：${b.startTime} - ${b.endTime}</div>
                <div class="detail-item-title">📋 课项目/用途：${b.purpose}</div>
                <span class="detail-item-meta ${roomInfo.class}">📍 空间状态：${roomInfo.name}</span>
                ${b.memo ? `<div class="detail-item-memo"><strong>📝 运营备注：</strong>${b.memo}</div>` : ''}
                <button class="delete-btn" onclick="deleteBooking('${b.id}', '${dateStr}')">释放清空</button>
            `;
            body.appendChild(item);
        });
    }

    document.getElementById('modalOverlay').classList.add('active');
}

// 关闭弹窗
function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

// 移除单项日程
function deleteBooking(id, dateStr) {
    if (confirm('确认要释放并删除这条记录吗？数据移除后无法恢复。')) {
        bookings = bookings.filter(b => b.id !== id);
        localStorage.setItem('ipro_bookings', JSON.stringify(bookings));
        
        // 级联刷新
        openModal(dateStr);
        renderCalendar();
    }
}
