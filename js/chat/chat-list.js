// 전역 변수
let currentChatId = null;
let chatListener = null;
let messageListener = null;
let userCache = new Map(); // 사용자 정보 캐시

// 로그인 상태 확인
auth.onAuthStateChanged((user) => {
    if (user) {
        // UID 검증
        if (user.uid !== ALLOWED_UID) {
            auth.signOut();
            window.location.href = '/login.html';
            return;
        }
        // 채팅 목록 로드
        loadChatList();
    } else {
        window.location.href = '/login.html';
    }
});

// 채팅 목록 로드 - 최적화 버전
async function loadChatList() {
    const chatList = document.getElementById('chatList');
    chatList.innerHTML = '<div class="loading">채팅 목록을 불러오는 중...</div>';
    
    try {
        // Realtime Database에서 채팅 목록 가져오기
        const chatRef = database.ref('chat');
        const snapshot = await chatRef.once('value');
        const chats = snapshot.val();
        
        if (!chats) {
            chatList.innerHTML = '<div class="no-chats">채팅 내역이 없습니다.</div>';
            return;
        }
        
        chatList.innerHTML = '';
        
        // 모든 프로미스를 병렬로 처리
        const chatPromises = Object.entries(chats).map(async ([chatId, chatData]) => {
            const [firstId, secondId] = chatId.split('_');
            
            // 사용자 정보와 마지막 메시지를 병렬로 가져오기
            const [userInfo, lastMessage] = await Promise.all([
                getUserInfo(firstId, secondId),
                getLastMessage(chatId)
            ]);
            
            return {
                id: chatId,
                userId: firstId,
                tripfriendsId: secondId,
                userInfo,
                lastMessage,
                info: chatData.info
            };
        });
        
        // 모든 채팅 데이터가 준비될 때까지 대기
        const chatArray = await Promise.all(chatPromises);
        
        // 최신 메시지 순으로 정렬
        chatArray.sort((a, b) => {
            const timeA = a.lastMessage?.timestamp || 0;
            const timeB = b.lastMessage?.timestamp || 0;
            return timeB - timeA;
        });
        
        // 채팅 목록 표시
        chatArray.forEach(chat => {
            const chatItem = createChatItem(chat);
            chatList.appendChild(chatItem);
        });
        
        // 실시간 업데이트 리스너 설정
        setupRealtimeListener();
        
    } catch (error) {
        console.error('채팅 목록 로드 에러:', error);
        chatList.innerHTML = '<div class="no-chats">채팅 목록을 불러올 수 없습니다.</div>';
    }
}

// 사용자 정보 가져오기 - 캐싱 적용
async function getUserInfo(firstId, secondId) {
    const cacheKey = `${firstId}_${secondId}`;
    
    // 캐시에 있으면 바로 반환
    if (userCache.has(cacheKey)) {
        return userCache.get(cacheKey);
    }
    
    try {
        // 디버깅용 로그
        console.log('getUserInfo 호출:', { firstId, secondId });
        
        // 두 가지 경우를 모두 확인: firstId_secondId와 secondId_firstId
        const [
            userDoc1, friendDoc1,  // firstId를 users, secondId를 tripfriends_users로 시도
            userDoc2, friendDoc2   // secondId를 users, firstId를 tripfriends_users로 시도
        ] = await Promise.all([
            db.collection('users').doc(firstId).get(),
            db.collection('tripfriends_users').doc(secondId).get(),
            db.collection('users').doc(secondId).get(),
            db.collection('tripfriends_users').doc(firstId).get()
        ]);
        
        console.log('문서 존재 여부:', { 
            case1: { userExists: userDoc1.exists, friendExists: friendDoc1.exists },
            case2: { userExists: userDoc2.exists, friendExists: friendDoc2.exists }
        });
        
        let userData, friendData, userName, friendName;
        
        // 첫 번째 경우: firstId = userId, secondId = tripfriendsId
        if (userDoc1.exists && friendDoc1.exists) {
            userData = userDoc1.data();
            friendData = friendDoc1.data();
            userName = userData.name || userData.email || firstId;
            friendName = friendData.name || secondId;
            console.log('Case 1 사용 (firstId=user, secondId=friend):', { userName, friendName });
        }
        // 두 번째 경우: secondId = userId, firstId = tripfriendsId
        else if (userDoc2.exists && friendDoc2.exists) {
            userData = userDoc2.data();
            friendData = friendDoc2.data();
            userName = userData.name || userData.email || secondId;
            friendName = friendData.name || firstId;
            console.log('Case 2 사용 (secondId=user, firstId=friend):', { userName, friendName });
        }
        // 부분적으로 존재하는 경우 처리
        else {
            // 가능한 데이터 조합
            const possibleUserData = userDoc1.exists ? userDoc1.data() : (userDoc2.exists ? userDoc2.data() : {});
            const possibleFriendData = friendDoc1.exists ? friendDoc1.data() : (friendDoc2.exists ? friendDoc2.data() : {});
            
            userName = possibleUserData.name || possibleUserData.email || firstId;
            friendName = possibleFriendData.name || secondId;
            
            console.log('부분 데이터 사용:', { 
                userDoc1Exists: userDoc1.exists,
                userDoc2Exists: userDoc2.exists,
                friendDoc1Exists: friendDoc1.exists,
                friendDoc2Exists: friendDoc2.exists,
                userName, 
                friendName 
            });
        }
        
        const userInfo = {
            userName: userName || firstId,
            friendName: friendName || secondId
        };
        
        console.log('최종 userInfo:', userInfo);
        
        // 캐시에 저장
        userCache.set(cacheKey, userInfo);
        
        return userInfo;
    } catch (error) {
        console.error('사용자 정보 로드 에러:', error, { firstId, secondId });
        const defaultInfo = {
            userName: firstId,
            friendName: secondId
        };
        
        // 에러 발생 시에도 캐시에 저장 (재시도 방지)
        userCache.set(cacheKey, defaultInfo);
        
        return defaultInfo;
    }
}

// 마지막 메시지 가져오기
async function getLastMessage(chatId) {
    try {
        const messagesRef = database.ref(`chat/${chatId}/messages`);
        const snapshot = await messagesRef.orderByChild('timestamp').limitToLast(1).once('value');
        const messages = snapshot.val();
        
        if (messages) {
            const messageId = Object.keys(messages)[0];
            return messages[messageId];
        }
        
        return null;
    } catch (error) {
        console.error('마지막 메시지 로드 에러:', error);
        return null;
    }
}

// 채팅 아이템 생성
function createChatItem(chat) {
    const div = document.createElement('div');
    div.className = 'chat-item';
    div.dataset.chatId = chat.id;
    
    const lastMessageTime = chat.lastMessage ? formatTime(chat.lastMessage.timestamp) : '';
    const lastMessageContent = chat.lastMessage ? chat.lastMessage.content : '메시지가 없습니다';
    
    div.innerHTML = `
        <div class="chat-item-header">
            <span class="chat-item-name">${chat.userInfo.friendName}</span>
            <span class="chat-item-time">${lastMessageTime}</span>
        </div>
        <div class="chat-item-preview">
            ${chat.userInfo.userName}: ${lastMessageContent}
        </div>
    `;
    
    div.addEventListener('click', () => openChat(chat));
    
    return div;
}

// 채팅 열기
async function openChat(chat) {
    // 현재 선택된 채팅 표시
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-chat-id="${chat.id}"]`).classList.add('active');
    
    currentChatId = chat.id;
    
    // 채팅 상세 섹션 업데이트
    const detailSection = document.getElementById('chatDetailSection');
    detailSection.innerHTML = `
        <div class="chat-detail-header">
            <div class="chat-detail-info">
                <h3>${chat.userInfo.friendName} ↔ ${chat.userInfo.userName}</h3>
                <p>대화 내용</p>
            </div>
        </div>
        <div class="chat-messages" id="chatMessages">
            <div class="loading">메시지를 불러오는 중...</div>
        </div>
        <div class="chat-input-container">
            <input type="text" class="chat-input" id="messageInput" placeholder="메시지를 입력하세요..." disabled>
            <button class="btn-send" id="sendButton" disabled>전송</button>
        </div>
    `;
    
    // 메시지 로드 및 실시간 리스너 설정
    loadMessages(chat.id, chat.userInfo);
}

// 메시지 로드
function loadMessages(chatId, userInfo) {
    // 기존 리스너 제거
    if (messageListener) {
        messageListener.off();
    }
    
    const messagesContainer = document.getElementById('chatMessages');
    const messagesRef = database.ref(`chat/${chatId}/messages`);
    
    // 실시간 메시지 리스너
    messageListener = messagesRef.orderByChild('timestamp');
    
    messageListener.on('value', (snapshot) => {
        messagesContainer.innerHTML = '';
        const messages = snapshot.val();
        
        if (!messages) {
            messagesContainer.innerHTML = '<div class="no-chats">메시지가 없습니다.</div>';
            return;
        }
        
        // 메시지를 배열로 변환하고 정렬
        const messageArray = Object.entries(messages).map(([id, data]) => ({
            id,
            ...data
        }));
        
        messageArray.sort((a, b) => a.timestamp - b.timestamp);
        
        // 메시지 표시
        messageArray.forEach(message => {
            const messageEl = createMessageElement(message, userInfo);
            messagesContainer.appendChild(messageEl);
        });
        
        // 스크롤을 맨 아래로
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

// 메시지 엘리먼트 생성
function createMessageElement(message, userInfo) {
    const div = document.createElement('div');
    
    // senderId로 메시지 방향 결정
    // senderId가 채팅방 ID의 어느 부분과 같은지 확인
    const [firstId, secondId] = currentChatId.split('_');
    const isFromFirst = message.senderId === firstId;
    
    div.className = `message ${isFromFirst ? 'received' : 'sent'}`;
    
    const time = formatTime(message.timestamp);
    const senderName = isFromFirst ? userInfo.userName : userInfo.friendName;
    
    div.innerHTML = `
        <div class="message-content">
            <div class="message-sender">${senderName}</div>
            ${message.content}
            <div class="message-info">${time}</div>
        </div>
    `;
    
    return div;
}

// 시간 포맷
function formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    
    // 오늘인 경우
    if (date.toDateString() === now.toDateString()) {
        const hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const period = hours >= 12 ? '오후' : '오전';
        const displayHours = hours > 12 ? hours - 12 : hours || 12;
        return `${period} ${displayHours}:${minutes}`;
    }
    
    // 어제인 경우
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return '어제';
    }
    
    // 그 외
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}월 ${day}일`;
}

// 실시간 업데이트 리스너 설정
function setupRealtimeListener() {
    // 기존 리스너가 있으면 제거
    if (chatListener) {
        chatListener.off();
    }
    
    // 새 메시지 리스너 설정
    const chatRef = database.ref('chat');
    chatListener = chatRef.on('child_changed', async (snapshot) => {
        const chatId = snapshot.key;
        const chatData = snapshot.val();
        
        // 변경된 채팅방의 정보만 업데이트
        const [firstId, secondId] = chatId.split('_');
        const userInfo = await getUserInfo(firstId, secondId);
        const lastMessage = await getLastMessage(chatId);
        
        // 기존 채팅 아이템 찾기
        const existingItem = document.querySelector(`[data-chat-id="${chatId}"]`);
        
        if (existingItem) {
            // 마지막 메시지 업데이트
            const preview = existingItem.querySelector('.chat-item-preview');
            const time = existingItem.querySelector('.chat-item-time');
            
            if (lastMessage) {
                preview.textContent = `${userInfo.userName}: ${lastMessage.content}`;
                time.textContent = formatTime(lastMessage.timestamp);
            }
            
            // 목록 맨 위로 이동
            const chatList = document.getElementById('chatList');
            chatList.insertBefore(existingItem, chatList.firstChild);
        }
    });
}

// 페이지 언로드 시 리스너 정리
window.addEventListener('beforeunload', () => {
    if (chatListener) {
        chatListener.off();
    }
    if (messageListener) {
        messageListener.off();
    }
    // 캐시 정리
    userCache.clear();
});