// 헤더 로드 함수
async function loadHeader() {
    try {
        const response = await fetch('/header.html');
        const headerHtml = await response.text();
        document.getElementById('header-container').innerHTML = headerHtml;
        
        // 헤더 로드 후 햄버거 메뉴 이벤트 등록
        const hamburger = document.getElementById('hamburger');
        const sidebar = document.getElementById('sidebar');
        
        if (hamburger && sidebar) {
            hamburger.addEventListener('click', function() {
                sidebar.classList.toggle('active');
            });
        }
    } catch (error) {
        console.error('헤더 로드 에러:', error);
    }
}