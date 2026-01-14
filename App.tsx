
import React, { useState, useEffect, useRef } from 'react';
import { User, Chat, Message, MessageType } from './types';
import { CURRENT_USER, INITIAL_CHATS, AI_USER } from './constants';
import VoiceCallOverlay from './components/VoiceCallOverlay';

const App: React.FC = () => {
  const [activeChatId, setActiveChatId] = useState<string>(INITIAL_CHATS[0].id);
  const [chats, setChats] = useState<Chat[]>(INITIAL_CHATS);
  const [messagesByChat, setMessagesByChat] = useState<Record<string, Message[]>>({
    'room-101': [
      { id: '1', senderId: 'user2', content: 'Did anyone see my keys?', type: MessageType.TEXT, timestamp: new Date(Date.now() - 3600000) },
      { id: '2', senderId: 'me', content: 'Check the mess counter.', type: MessageType.TEXT, timestamp: new Date(Date.now() - 3000000) },
      { id: '3', senderId: 'user3', content: 'They were on the sofa!', type: MessageType.TEXT, timestamp: new Date(Date.now() - 1500000) },
    ],
    'hostel-ai': [
      { id: 'ai1', senderId: 'ai-bot', content: 'Hello! I am your Hostel AI Assistant. How can I help you today?', type: MessageType.TEXT, timestamp: new Date() }
    ]
  });
  const [inputValue, setInputValue] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeChat = chats.find(c => c.id === activeChatId) || chats[0];
  const messages = messagesByChat[activeChatId] || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (content: string, type: MessageType = MessageType.TEXT, metadata?: any) => {
    if (!content.trim() && type === MessageType.TEXT) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: CURRENT_USER.id,
      content,
      type,
      timestamp: new Date(),
      metadata
    };

    setMessagesByChat(prev => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMessage]
    }));
    setInputValue('');

    // Update last message in chat list
    setChats(prev => prev.map(c => 
      c.id === activeChatId ? { ...c, lastMessage: type === MessageType.TEXT ? content : `Sent an ${type}` } : c
    ));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      let type = MessageType.FILE;
      if (file.type.startsWith('image/')) type = MessageType.IMAGE;
      if (file.type.startsWith('audio/')) type = MessageType.AUDIO;

      handleSendMessage(result, type, {
        fileName: file.name,
        fileSize: (file.size / 1024).toFixed(1) + ' KB',
        mimeType: file.type,
        previewUrl: result
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-1/4 min-w-[320px] border-r flex flex-col bg-slate-50">
        <div className="p-4 bg-teal-700 text-white flex justify-between items-center shadow-md">
          <div className="flex items-center space-x-3">
            <img src={CURRENT_USER.avatar} alt="Me" className="w-10 h-10 rounded-full border border-teal-500 shadow-sm" />
            <h1 className="font-bold text-lg">HostelConnect</h1>
          </div>
          <button className="p-2 hover:bg-teal-600 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>

        <div className="p-3">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search hostel groups or mates" 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {chats.map(chat => (
            <div 
              key={chat.id} 
              onClick={() => setActiveChatId(chat.id)}
              className={`flex items-center p-4 cursor-pointer border-b border-slate-100 hover:bg-slate-100 transition-colors ${activeChatId === chat.id ? 'bg-white shadow-sm border-l-4 border-l-teal-600' : ''}`}
            >
              <img src={chat.avatar} alt={chat.name} className="w-12 h-12 rounded-full object-cover mr-4 shadow-sm" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-semibold text-slate-800 truncate">{chat.name}</h3>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">12:30 PM</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-slate-500 truncate mr-2">{chat.lastMessage}</p>
                  {chat.unreadCount > 0 && (
                    <span className="bg-teal-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative bg-[#e5ddd5] bg-opacity-30">
        <div className="absolute inset-0 z-[-1] opacity-5 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}></div>
        
        {/* Chat Header */}
        <div className="p-4 bg-slate-50 border-b flex justify-between items-center shadow-sm z-10">
          <div className="flex items-center space-x-3">
            <img src={activeChat.avatar} alt={activeChat.name} className="w-10 h-10 rounded-full object-cover shadow-sm" />
            <div>
              <h2 className="font-bold text-slate-800">{activeChat.name}</h2>
              <p className="text-xs text-green-600 font-medium">online</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-slate-500">
            <button onClick={() => { setIsVideoCall(false); setIsCalling(true); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors active:scale-90">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
            <button onClick={() => { setIsVideoCall(true); setIsCalling(true); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors active:scale-90">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {messages.map((msg) => {
            const isMe = msg.senderId === CURRENT_USER.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-2xl p-3 shadow-sm relative ${isMe ? 'bg-teal-100 rounded-tr-none' : 'bg-white rounded-tl-none'}`}>
                  {!isMe && <p className="text-[10px] font-bold text-teal-600 mb-1 uppercase">Rahul</p>}
                  
                  {msg.type === MessageType.TEXT && (
                    <p className="text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  )}
                  
                  {msg.type === MessageType.IMAGE && (
                    <div className="space-y-2">
                        <img src={msg.content} alt="Shared content" className="rounded-lg max-h-60 object-cover w-full cursor-pointer hover:opacity-90 transition-opacity" />
                        {msg.metadata?.fileName && <p className="text-[10px] text-slate-500 italic">{msg.metadata.fileName}</p>}
                    </div>
                  )}

                  {msg.type === MessageType.AUDIO && (
                    <div className="flex items-center space-x-3 bg-slate-100 rounded-lg p-2 min-w-[200px]">
                      <div className="p-2 bg-teal-600 rounded-full text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="h-1 bg-slate-300 rounded-full w-full mb-1">
                            <div className="h-1 bg-teal-500 rounded-full w-[40%]"></div>
                        </div>
                        <p className="text-[10px] text-slate-500">Audio • 0:14</p>
                      </div>
                    </div>
                  )}

                  {msg.type === MessageType.FILE && (
                    <div className="flex items-center space-x-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
                      <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                         </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{msg.metadata?.fileName || 'Document'}</p>
                        <p className="text-[10px] text-slate-500 uppercase">{msg.metadata?.fileSize || 'Unknown size'}</p>
                      </div>
                      <button className="p-1 hover:bg-slate-200 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                    </div>
                  )}

                  <p className={`text-[9px] mt-1 text-right font-medium ${isMe ? 'text-teal-700' : 'text-slate-400'}`}>
                    12:45 PM {isMe && '✓✓'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-slate-50 border-t flex items-center space-x-3 z-10">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload}
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-500 hover:text-teal-600 transition-colors hover:bg-slate-200 rounded-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <div className="flex-1 relative">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
              placeholder="Type a message..." 
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
            />
          </div>
          {inputValue.trim() ? (
            <button 
              onClick={() => handleSendMessage(inputValue)}
              className="p-3 bg-teal-600 text-white rounded-full shadow-lg hover:bg-teal-700 transition-all active:scale-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          ) : (
            <button className="p-3 bg-slate-200 text-slate-500 rounded-full hover:bg-slate-300 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Call UI */}
      {isCalling && (
        <VoiceCallOverlay 
          chatName={activeChat.name} 
          chatAvatar={activeChat.avatar} 
          isVideo={isVideoCall}
          onClose={() => setIsCalling(false)} 
        />
      )}
    </div>
  );
};

export default App;
