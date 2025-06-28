// 현재 선택된 컬렉션
let currentCollection = 'tripfriends_users';
let unsubscribe = null; // 리스너 해제를 위한 변수
let allMembers = []; // 전체 회원 데이터 저장

// 로그인 상태 확인
auth.onAuthStateChanged((user) => {
    if (user) {
        // UID 검증
        if (user.uid !== ALLOWED_UID) {
            auth.signOut();
            window.location.href = '/login.html';
            return;
        }
        // 회원 목록 로드
        loadMembers();
        // 탭 이벤트 설정
        setupTabEvents();
        // 엑셀 다운로드 이벤트 설정
        setupExcelEvent();
        // 일괄 수정 이벤트 설정
        setupBatchUpdateEvent();
    } else {
        window.location.href = '/login.html';
    }
});

// 탭 이벤트 설정
function setupTabEvents() {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // 모든 탭 비활성화
            tabButtons.forEach(btn => btn.classList.remove('active'));
            // 클릭한 탭 활성화
            e.target.classList.add('active');
            // 컬렉션 변경
            currentCollection = e.target.dataset.collection;
            // 회원 목록 다시 로드
            loadMembers();
            // 일괄 수정 버튼 표시/숨김
            updateBatchUpdateButtonVisibility();
        });
    });
}

// 엑셀 다운로드 이벤트 설정
function setupExcelEvent() {
    const excelButton = document.getElementById('excelButton');
    excelButton.addEventListener('click', downloadExcel);
}

// 일괄 수정 이벤트 설정
function setupBatchUpdateEvent() {
    const batchUpdateButton = document.getElementById('batchUpdateButton');
    batchUpdateButton.addEventListener('click', batchUpdatePoints);
}

// 일괄 수정 버튼 표시/숨김
function updateBatchUpdateButtonVisibility() {
    const batchUpdateButton = document.getElementById('batchUpdateButton');
    if (currentCollection === 'users') {
        batchUpdateButton.style.display = 'block';
    } else {
        batchUpdateButton.style.display = 'none';
    }
}

// 총 개수 업데이트
function updateTotalCount(count) {
    const totalCountElement = document.getElementById('totalCount');
    totalCountElement.textContent = `총 ${count}개의 검색결과`;
}

// 위치 정보 포맷 (한글로 변환)
async function formatLocation(location) {
    if (!location) return '-';
    
    try {
        // 국가 정보 로드
        const countryResponse = await fetch('/data/country.json');
        const countryData = await countryResponse.json();
        const country = countryData.countries.find(c => c.code === location.nationality);
        const countryName = country ? country.name : location.nationality;
        
        // 도시 정보 로드
        let cityName = location.city;
        if (location.nationality) {
            try {
                const cityResponse = await fetch(`/data/city/${location.nationality}.json`);
                const cityData = await cityResponse.json();
                const city = cityData.cities.find(c => c.code === location.city);
                cityName = city ? city.name : location.city;
            } catch (error) {
                console.log('도시 파일 로드 실패:', error);
            }
        }
        
        // 나라, 도시 순서로 반환
        return `${countryName || '-'}, ${cityName || '-'}`;
    } catch (error) {
        console.error('위치 정보 로드 에러:', error);
        return `${location.nationality || '-'}, ${location.city || '-'}`;
    }
}

// 성별 텍스트 변환
function getGenderText(gender) {
    switch (gender) {
        case 'male':
            return '남성';
        case 'female':
            return '여성';
        default:
            return gender || '-';
    }
}

// 회원 목록 로드 (실시간 업데이트)
function loadMembers() {
    try {
        // 기존 리스너가 있으면 해제
        if (unsubscribe) {
            unsubscribe();
        }
        
        const memberTableBody = document.getElementById('memberTableBody');
        
        // 테이블 헤더 업데이트
        updateTableHeader();
        
        // 실시간 리스너 설정
        unsubscribe = db.collection(currentCollection).onSnapshot(async (snapshot) => {
            allMembers = [];
            
            // 데이터 수집
            for (const doc of snapshot.docs) {
                const member = doc.data();
                if (currentCollection === 'tripfriends_users' && member.name) {
                    allMembers.push({ id: doc.id, ...member });
                } else if (currentCollection === 'users') {
                    allMembers.push({ id: doc.id, ...member });
                }
            }
            
            // 화면에 표시
            displayMembers();
            
            // 일괄 수정 버튼 표시/숨김
            updateBatchUpdateButtonVisibility();
            
        }, (error) => {
            console.error('실시간 업데이트 에러:', error);
            alert('회원 목록을 불러오는데 실패했습니다.');
        });
        
    } catch (error) {
        console.error('회원 목록 로드 에러:', error);
        alert('회원 목록을 불러오는데 실패했습니다.');
    }
}

// 회원 목록 표시
async function displayMembers() {
    const memberTableBody = document.getElementById('memberTableBody');
    memberTableBody.innerHTML = '';
    
    // 총 개수 업데이트
    updateTotalCount(allMembers.length);
    
    // 테이블 행 생성
    const rowPromises = allMembers.map(member => createTableRow(member.id, member));
    const rows = await Promise.all(rowPromises);
    rows.forEach(row => memberTableBody.appendChild(row));
    
    if (allMembers.length === 0) {
        const colspan = currentCollection === 'tripfriends_users' ? '10' : '8';
        memberTableBody.innerHTML = `<tr><td colspan="${colspan}" class="no-data">등록된 회원이 없습니다.</td></tr>`;
    }
}

// 테이블 헤더 업데이트
function updateTableHeader() {
    const thead = document.querySelector('.member-table thead');
    
    if (currentCollection === 'tripfriends_users') {
        thead.innerHTML = `
            <tr>
                <th>이름</th>
                <th>추천인코드</th>
                <th>시간당가격</th>
                <th>위치(국가/도시)</th>
                <th>성별</th>
                <th>포인트</th>
                <th>가입일자</th>
                <th>활동여부</th>
                <th>승인여부</th>
                <th>상세보기</th>
            </tr>
        `;
    } else {
        thead.innerHTML = `
            <tr>
                <th>이메일</th>
                <th>이름</th>
                <th>성별</th>
                <th>추천인</th>
                <th>포인트</th>
                <th>가입일</th>
                <th>상태</th>
                <th>상세보기</th>
            </tr>
        `;
    }
}

// 테이블 행 생성 (비동기)
async function createTableRow(docId, member) {
    const row = document.createElement('tr');
    
    // 컬렉션에 따라 다른 필드 표시
    if (currentCollection === 'tripfriends_users') {
        const locationText = await formatLocation(member.location);
        const activeClass = member.isActive ? 'status-active' : 'status-inactive';
        const approvedClass = member.isApproved ? 'status-approved' : 'status-pending';
        
        row.innerHTML = `
            <td>${member.name || '-'}</td>
            <td>${member.referrer_code || '-'}</td>
            <td>${member.pricePerHour ? `${member.currencySymbol || ''}${member.pricePerHour.toLocaleString()}` : '-'}</td>
            <td>${locationText}</td>
            <td>${getGenderText(member.gender)}</td>
            <td>${member.point || '0'}</td>
            <td>${member.createdAt ? formatDate(member.createdAt) : '-'}</td>
            <td><span class="${activeClass}">${member.isActive ? '활동중' : '비활동'}</span></td>
            <td><span class="${approvedClass}">${member.isApproved ? '승인완료' : '승인대기'}</span></td>
            <td>
                <button onclick="viewDetail('${docId}', 'tripfriends')" 
                        style="padding: 4px 12px; background-color: #4285f4; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">
                    상세보기
                </button>
            </td>
        `;
    } else {
        // users 컬렉션
        row.innerHTML = `
            <td>${member.email || '-'}</td>
            <td>${member.name || '-'}</td>
            <td>${getGenderText(member.gender)}</td>
            <td>${member.referredBy || '-'}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 5px;">
                    <input type="number" id="points-${docId}" value="${member.points || '0'}" 
                           data-original="${member.points || '0'}"
                           style="width: 80px; padding: 4px; border: 1px solid #ddd; border-radius: 3px; text-align: center;"
                           onclick="event.stopPropagation()">
                    <button onclick="updatePoints('${docId}')" 
                            style="padding: 4px 10px; background-color: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">
                        수정
                    </button>
                </div>
            </td>
            <td>${member.createdAt ? formatDate(member.createdAt) : '-'}</td>
            <td>${member.status || '활성'}</td>
            <td>
                <button onclick="viewDetail('${docId}', 'tripjoy')" 
                        style="padding: 4px 12px; background-color: #4285f4; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">
                    상세보기
                </button>
            </td>
        `;
    }
    
    return row;
}

// 날짜 포맷
function formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}년 ${month}월 ${day}일`;
}

// 엑셀 다운로드
async function downloadExcel() {
    try {
        // 엑셀 데이터 준비
        let csvContent = '';
        
        if (currentCollection === 'tripfriends_users') {
            csvContent = '이름,추천인코드,시간당가격,위치,성별,포인트,가입일자,활동여부,승인여부\n';
            
            for (const member of allMembers) {
                const location = await formatLocation(member.location);
                const row = [
                    member.name || '-',
                    member.referrer_code || '-',
                    member.pricePerHour ? `${member.currencySymbol || ''}${member.pricePerHour.toLocaleString()}` : '-',
                    location,
                    getGenderText(member.gender),
                    member.point || '0',
                    member.createdAt ? formatDate(member.createdAt) : '-',
                    member.isActive ? '활동중' : '비활동',
                    member.isApproved ? '승인완료' : '승인대기'
                ].join(',');
                csvContent += row + '\n';
            }
        } else {
            csvContent = '이메일,이름,성별,추천인,포인트,가입일,상태\n';
            
            for (const member of allMembers) {
                const row = [
                    member.email || '-',
                    member.name || '-',
                    getGenderText(member.gender),
                    member.referredBy || '-',
                    member.points || '0',
                    member.createdAt ? formatDate(member.createdAt) : '-',
                    member.status || '활성'
                ].join(',');
                csvContent += row + '\n';
            }
        }
        
        // BOM 추가 (한글 깨짐 방지)
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        
        // 다운로드
        const link = document.createElement('a');
        const filename = currentCollection === 'tripfriends_users' ? '트립프렌즈_회원목록.csv' : '트립조이_회원목록.csv';
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        
    } catch (error) {
        console.error('엑셀 다운로드 에러:', error);
        alert('엑셀 다운로드에 실패했습니다.');
    }
}

// 페이지 언로드 시 리스너 해제
window.addEventListener('beforeunload', () => {
    if (unsubscribe) {
        unsubscribe();
    }
});

// 포인트 수정 함수
async function updatePoints(memberId) {
    event.stopPropagation(); // 이벤트 버블링 방지
    
    const pointInput = document.getElementById(`points-${memberId}`);
    const newPoints = parseInt(pointInput.value) || 0;
    
    if (newPoints < 0) {
        alert('포인트는 0 이상이어야 합니다.');
        return;
    }
    
    try {
        await db.collection('users').doc(memberId).update({
            points: newPoints,
            lastPointUpdate: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert('포인트가 수정되었습니다.');
    } catch (error) {
        console.error('포인트 수정 에러:', error);
        alert('포인트 수정에 실패했습니다.');
    }
}

// 상세보기 함수
function viewDetail(docId, type) {
    event.stopPropagation(); // 이벤트 버블링 방지
    
    if (type === 'tripfriends') {
        window.location.href = `/member/tripfriends-detail.html?id=${docId}`;
    } else {
        window.location.href = `/member/tripjoy-detail.html?id=${docId}`;
    }
}

// 포인트 일괄 수정 함수
async function batchUpdatePoints() {
    if (currentCollection !== 'users') {
        alert('트립조이 회원만 일괄 수정이 가능합니다.');
        return;
    }
    
    const updates = [];
    const inputs = document.querySelectorAll('input[id^="points-"]');
    
    inputs.forEach(input => {
        const memberId = input.id.replace('points-', '');
        const newPoints = parseInt(input.value) || 0;
        const originalPoints = parseInt(input.getAttribute('data-original')) || 0;
        
        // 변경된 포인트만 추가
        if (newPoints !== originalPoints && newPoints >= 0) {
            updates.push({
                id: memberId,
                points: newPoints
            });
        }
    });
    
    if (updates.length === 0) {
        alert('변경된 포인트가 없습니다.');
        return;
    }
    
    if (!confirm(`${updates.length}명의 포인트를 수정하시겠습니까?`)) {
        return;
    }
    
    try {
        // Batch 작업으로 일괄 업데이트
        const batch = db.batch();
        
        updates.forEach(update => {
            const docRef = db.collection('users').doc(update.id);
            batch.update(docRef, {
                points: update.points,
                lastPointUpdate: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        
        await batch.commit();
        
        alert(`${updates.length}명의 포인트가 수정되었습니다.`);
        
        // 원본 값 업데이트
        updates.forEach(update => {
            const input = document.getElementById(`points-${update.id}`);
            if (input) {
                input.setAttribute('data-original', update.points);
            }
        });
        
    } catch (error) {
        console.error('일괄 포인트 수정 에러:', error);
        alert('일괄 포인트 수정에 실패했습니다.');
    }
}

// 전역 함수로 등록
window.updatePoints = updatePoints;
window.viewDetail = viewDetail;
window.batchUpdatePoints = batchUpdatePoints;