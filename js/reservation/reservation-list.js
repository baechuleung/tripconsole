// 로그인 상태 확인
auth.onAuthStateChanged((user) => {
    if (user) {
        // UID 검증
        if (user.uid !== ALLOWED_UID) {
            auth.signOut();
            window.location.href = '/login.html';
            return;
        }
        // 예약 내역 로드
        loadReservations();
    } else {
        window.location.href = '/login.html';
    }
});

// 예약 내역 로드 - 병렬 처리 버전
async function loadReservations() {
    try {
        const reservationTableBody = document.getElementById('reservationTableBody');
        reservationTableBody.innerHTML = '<tr><td colspan="6" class="no-data">데이터를 불러오는 중...</td></tr>';
        
        // 모든 예약 내역을 저장할 배열
        const allReservations = [];
        
        // 모든 tripfriends_users 가져오기 (한번에)
        const usersSnapshot = await db.collection('tripfriends_users').get();
        
        // 병렬로 모든 예약 가져오기
        const reservationPromises = usersSnapshot.docs.map(async (userDoc) => {
            const userData = userDoc.data();
            const reservationsSnapshot = await db.collection('tripfriends_users')
                .doc(userDoc.id)
                .collection('reservations')
                .get();
            
            return reservationsSnapshot.docs.map(resDoc => ({
                id: resDoc.id,
                friendName: userData.name || '-',
                friendId: userDoc.id,
                ...resDoc.data()
            }));
        });
        
        // 모든 Promise가 완료될 때까지 대기
        const reservationArrays = await Promise.all(reservationPromises);
        
        // 2차원 배열을 1차원으로 평탄화
        reservationArrays.forEach(reservations => {
            allReservations.push(...reservations);
        });
        
        // 날짜순으로 정렬 (최신순)
        allReservations.sort((a, b) => {
            const dateA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : new Date(0);
            const dateB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : new Date(0);
            return dateB - dateA;
        });
        
        // 테이블 초기화
        reservationTableBody.innerHTML = '';
        
        if (allReservations.length === 0) {
            reservationTableBody.innerHTML = '<tr><td colspan="6" class="no-data">예약 내역이 없습니다.</td></tr>';
            return;
        }
        
        // 예약 내역 표시
        allReservations.forEach((reservation) => {
            const row = createReservationRow(reservation);
            reservationTableBody.appendChild(row);
        });
        
    } catch (error) {
        console.error('예약 내역 로드 에러:', error);
        const reservationTableBody = document.getElementById('reservationTableBody');
        reservationTableBody.innerHTML = '<tr><td colspan="6" class="no-data">예약 내역을 불러오는데 실패했습니다.</td></tr>';
    }
}

// 예약 행 생성
function createReservationRow(reservation) {
    const row = document.createElement('tr');
    
    // 예약번호
    const reservationNumber = reservation.reservationNumber || reservation.id.substring(0, 10).toUpperCase();
    
    // 신청날짜
    const createdDate = formatDate(reservation.createdAt);
    
    // 예약일시
    const useDateTime = formatReservationDateTime(reservation);
    
    // 상태
    const statusBadge = getStatusBadge(reservation.status);
    
    row.innerHTML = `
        <td>${reservationNumber}</td>
        <td>${reservation.friendName}</td>
        <td>${reservation.userName || '-'}</td>
        <td>${createdDate}</td>
        <td>${useDateTime}</td>
        <td>${statusBadge}</td>
    `;
    
    // 클릭 이벤트 추가 (상세보기)
    row.style.cursor = 'pointer';
    row.addEventListener('click', () => {
        alert('상세 페이지는 준비중입니다.');
    });
    
    return row;
}

// 날짜 포맷
function formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day} 오후 ${hours}:${minutes}:${day}`;
}

// 예약 일시 포맷
function formatReservationDateTime(reservation) {
    if (reservation.useDate && reservation.startTime) {
        return `${reservation.useDate} 오후 ${reservation.startTime}`;
    }
    
    if (reservation.schedule_info && reservation.schedule_info.scheduled_time) {
        const scheduledTime = new Date(reservation.schedule_info.scheduled_time);
        const year = scheduledTime.getFullYear();
        const month = String(scheduledTime.getMonth() + 1).padStart(2, '0');
        const day = String(scheduledTime.getDate()).padStart(2, '0');
        const hours = scheduledTime.getHours();
        const minutes = String(scheduledTime.getMinutes()).padStart(2, '0');
        const period = hours >= 12 ? '오후' : '오전';
        const displayHours = hours > 12 ? hours - 12 : hours;
        return `${year}.${month}.${day} ${period} ${displayHours}:${minutes}`;
    }
    
    return '-';
}

// 상태 배지 생성
function getStatusBadge(status) {
    const statusMap = {
        'pending': { text: '예약확정', class: 'status-pending' },
        'confirmed': { text: '예약확정', class: 'status-confirmed' },
        'in_progress': { text: '예약진행', class: 'status-in-progress' },
        'completed': { text: '예약완료', class: 'status-completed' },
        'cancelled': { text: '예약취소', class: 'status-cancelled' }
    };
    
    const statusInfo = statusMap[status] || { text: status || '알 수 없음', class: 'status-pending' };
    return `<span class="${statusInfo.class}">${statusInfo.text}</span>`;
}