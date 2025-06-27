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
        });
    });
}

// 엑셀 다운로드 이벤트 설정
function setupExcelEvent() {
    const excelButton = document.getElementById('excelButton');
    excelButton.addEventListener('click', downloadExcel);
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
        const colspan = currentCollection === 'tripfriends_users' ? '9' : '7';
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
        `;
    } else {
        // users 컬렉션
        row.innerHTML = `
            <td>${member.email || '-'}</td>
            <td>${member.name || '-'}</td>
            <td>${getGenderText(member.gender)}</td>
            <td>${member.referredBy || '-'}</td>
            <td>${member.points || '0'}</td>
            <td>${member.createdAt ? formatDate(member.createdAt) : '-'}</td>
            <td>${member.status || '활성'}</td>
        `;
    }
    
    // 클릭 이벤트 추가
    row.style.cursor = 'pointer';
    row.addEventListener('click', () => {
        if (currentCollection === 'tripfriends_users') {
            window.location.href = `/member/tripfriends-detail.html?id=${docId}`;
        } else {
            window.location.href = `/member/tripjoy-detail.html?id=${docId}`;
        }
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