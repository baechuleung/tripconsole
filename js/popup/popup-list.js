document.addEventListener('DOMContentLoaded', function() {
    loadPopups();
});

async function loadPopups() {
    const loading = document.getElementById('loading');
    const popupList = document.getElementById('popupList');
    
    try {
        const snapshot = await firebase.firestore()
            .collection('popups')
            .orderBy('createdAt', 'desc')
            .get();
        
        loading.style.display = 'none';
        
        if (snapshot.empty) {
            popupList.innerHTML = `
                <div class="empty-state">
                    <h3>등록된 팝업이 없습니다</h3>
                    <p>새로운 팝업을 등록해주세요.</p>
                </div>
            `;
            return;
        }
        
        popupList.innerHTML = '';
        
        snapshot.forEach(doc => {
            const popup = doc.data();
            const popupId = doc.id;
            
            // 날짜 포맷팅
            const startDate = popup.startDate.toDate();
            const endDate = popup.endDate.toDate();
            const now = new Date();
            
            // 상태 확인
            const isExpired = now > endDate;
            const isUpcoming = now < startDate;
            const isRunning = now >= startDate && now <= endDate;
            
            let statusText = '';
            let statusClass = '';
            
            if (isExpired) {
                statusText = '종료됨';
                statusClass = 'status-inactive';
            } else if (isUpcoming) {
                statusText = '예정';
                statusClass = 'status-inactive';
            } else if (isRunning && popup.isActive) {
                statusText = '진행중';
                statusClass = 'status-active';
            } else {
                statusText = '비활성';
                statusClass = 'status-inactive';
            }
            
            const card = document.createElement('div');
            card.className = 'popup-card';
            card.innerHTML = `
                <img src="${popup.imageUrl}" alt="${popup.title}" class="popup-image">
                <div class="popup-info">
                    <h3 class="popup-title">${popup.title}</h3>
                    <p class="popup-meta">시작: ${formatDate(startDate)}</p>
                    <p class="popup-meta">종료: ${formatDate(endDate)}</p>
                    <div class="popup-status">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                        <span class="priority-badge">우선순위: ${popup.priority}</span>
                    </div>
                </div>
                <div class="popup-actions">
                    <button class="btn-small btn-edit" onclick="editPopup('${popupId}')">수정</button>
                    <button class="btn-small btn-delete" onclick="deletePopup('${popupId}')">삭제</button>
                </div>
            `;
            
            popupList.appendChild(card);
        });
        
    } catch (error) {
        console.error('팝업 목록 로딩 오류:', error);
        loading.textContent = '팝업 목록을 불러오는 중 오류가 발생했습니다.';
    }
}

function formatDate(date) {
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

async function deletePopup(popupId) {
    if (!confirm('정말로 이 팝업을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        // Firestore에서 팝업 정보 가져오기
        const doc = await firebase.firestore().collection('popups').doc(popupId).get();
        const popup = doc.data();
        
        // Storage에서 이미지 삭제
        if (popup.imageUrl) {
            try {
                const storage = firebase.storage();
                const imageRef = storage.refFromURL(popup.imageUrl);
                await imageRef.delete();
            } catch (storageError) {
                console.error('이미지 삭제 오류:', storageError);
            }
        }
        
        // Firestore에서 문서 삭제
        await firebase.firestore().collection('popups').doc(popupId).delete();
        
        alert('팝업이 삭제되었습니다.');
        loadPopups();
        
    } catch (error) {
        console.error('팝업 삭제 오류:', error);
        alert('팝업 삭제 중 오류가 발생했습니다.');
    }
}

function editPopup(popupId) {
    // 수정 페이지로 이동 (추후 구현)
    alert('수정 기능은 준비 중입니다.');
}