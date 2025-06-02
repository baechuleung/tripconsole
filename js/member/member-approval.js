// Firestore는 이미 firebase-config.js에서 초기화됨
// const db = firebase.firestore();

// 로그인 상태 확인
auth.onAuthStateChanged((user) => {
    if (user) {
        // UID 검증
        if (user.uid !== ALLOWED_UID) {
            auth.signOut();
            window.location.href = '/login.html';
            return;
        }
        // 승인 대기 목록 로드
        loadPendingApprovals();
    } else {
        window.location.href = '/login.html';
    }
});

// 승인 대기 회원 목록 로드
async function loadPendingApprovals() {
    try {
        const snapshot = await db.collection('users')
            .where('status', '==', 'pending')
            .get();
        
        const approvalTableBody = document.getElementById('approvalTableBody');
        approvalTableBody.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const member = doc.data();
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${member.email || '-'}</td>
                <td>${member.name || '-'}</td>
                <td>${member.createdAt ? formatDate(member.createdAt) : '-'}</td>
                <td><span class="status-pending">대기중</span></td>
                <td>
                    <button class="btn-approve" onclick="approveMember('${doc.id}')">승인</button>
                    <button class="btn-reject" onclick="rejectMember('${doc.id}')">거절</button>
                </td>
            `;
            
            approvalTableBody.appendChild(row);
        });
        
        if (snapshot.empty) {
            approvalTableBody.innerHTML = '<tr><td colspan="5" class="no-data">승인 대기중인 회원이 없습니다.</td></tr>';
        }
    } catch (error) {
        console.error('승인 대기 목록 로드 에러:', error);
        alert('승인 대기 목록을 불러오는데 실패했습니다.');
    }
}

// 회원 승인
async function approveMember(userId) {
    if (!confirm('이 회원을 승인하시겠습니까?')) return;
    
    try {
        await db.collection('users').doc(userId).update({
            status: 'approved',
            approvedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert('회원이 승인되었습니다.');
        loadPendingApprovals();
    } catch (error) {
        console.error('회원 승인 에러:', error);
        alert('회원 승인에 실패했습니다.');
    }
}

// 회원 거절
async function rejectMember(userId) {
    if (!confirm('이 회원을 거절하시겠습니까?')) return;
    
    try {
        await db.collection('users').doc(userId).update({
            status: 'rejected',
            rejectedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert('회원이 거절되었습니다.');
        loadPendingApprovals();
    } catch (error) {
        console.error('회원 거절 에러:', error);
        alert('회원 거절에 실패했습니다.');
    }
}

// 날짜 포맷
function formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('ko-KR');
}