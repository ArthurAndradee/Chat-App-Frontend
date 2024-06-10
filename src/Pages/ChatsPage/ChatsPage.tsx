/* eslint-disable jsx-a11y/alt-text */
import React, { useState, useEffect, FormEvent } from 'react';
import io, { Socket } from 'socket.io-client';
import './ChatPage.css';

interface Message {
  roomId: string;
  sender: string;
  message: string;
  timestamp: string;
}

interface ActiveChats {
  [key: string]: Message[];
}

interface User {
  username: string;
  profilePicture: File | ArrayBuffer | null;
}

interface ChatsPageProps {
  username: string;
  profilePicture: File | null;
}

const socket: Socket = io('http://localhost:5000');

const ChatsPage: React.FC<ChatsPageProps> = ({ username, profilePicture }) => {
  const [showAboutContainer, setShowAboutContainer] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [activeChats, setActiveChats] = useState<ActiveChats>({});
  const [currentRecipient, setCurrentRecipient] = useState<string>('');

  const getProfilePictureUrl = (profilePicture: File | ArrayBuffer | null) => {
    if (profilePicture instanceof File) {
      return URL.createObjectURL(profilePicture);
    } else if (profilePicture instanceof ArrayBuffer) {
      return URL.createObjectURL(new Blob([profilePicture]));
    }
    return '';
  };

  useEffect(() => {
    if (username && profilePicture) {
      socket.emit('join', { username, profilePicture });
    }

    socket.on('users', (usersList: User[]) => {
      const uniqueUsers = Array.from(new Set(usersList.map(user => user.username)))
        .map(username => {
          return usersList.find(user => user.username === username)!;
        });
      setUsers(uniqueUsers);
    });

    socket.on('userLeft', (leftUser: string) => {
      setUsers((prevUsers) => prevUsers.filter(user => user.username !== leftUser));
    });

    socket.on('receiveMessage', (data: { sender: string; message: string; roomId: string; timestamp: string }) => {
      const { sender, message, roomId, timestamp } = data;
      setActiveChats((prevChats) => ({
        ...prevChats,
        [roomId]: [...(prevChats[roomId] || []), { sender, message, timestamp, roomId }],
      }));
    });

    socket.on('loadMessages', (messages: Message[]) => {
      const roomId = messages.length > 0 ? messages[0].roomId : '';
      setActiveChats((prevChats) => ({
        ...prevChats,
        [roomId]: messages,
      }));
    });

    return () => {
      socket.off('users');
      socket.off('userLeft');
      socket.off('receiveMessage');
      socket.off('loadMessages');
    };
  }, [username, profilePicture]);

  const startChat = (recipient: string) => {
    const roomId = [username, recipient].sort().join('-');
    if (!activeChats[roomId]) {
      socket.emit('fetchMessages', roomId);
    }
    setCurrentRecipient(recipient);
  };

  const sendMessage = (message: string) => {
    const roomId = [username, currentRecipient].sort().join('-');
    const timestamp = new Date().toLocaleTimeString();
    socket.emit('privateMessage', {
      recipient: currentRecipient,
      message,
      sender: username,
      timestamp,
      roomId,
    });
    setActiveChats((prevChats) => ({
      ...prevChats,
      [roomId]: [...(prevChats[roomId] || []), { sender: username, message, timestamp, roomId }],
    }));
  };

  const currentRecipientUser = users.find(user => user.username === currentRecipient);

  return (
    <div className="sections-container">
      <section className="contacts-container">
        <header className="d-flex search-container">
          <input className="search-about" placeholder="Chats" />
        </header>
        {users.filter(user => user.username !== username).map((user, index) => (
          <div key={index} className="contact-container d-flex" onClick={() => startChat(user.username)}>
            {user.profilePicture &&
              <img className="chat-picture" src={getProfilePictureUrl(user.profilePicture)} alt={user.username} />
            }
            <div className="chat-info">
              <div className="chat-name">{user.username}</div>
              <div className="chat-message">Click to chat</div>
            </div>
          </div>
        ))}
      </section>
      <section className="chat-container">
        {currentRecipient && (
          <>
            <header className="d-flex">
              {currentRecipientUser?.profilePicture && (
                <img
                  className="chat-picture"
                  onClick={() => setShowAboutContainer(!showAboutContainer)}
                  src={getProfilePictureUrl(currentRecipientUser.profilePicture)}
                  alt={currentRecipient}
                />
              )}
              <div className="chat-info">
                <div className="chat-name">{currentRecipient}</div>
                <div className="chat-status">Status</div>
              </div>
            </header>
            <div className="chat-messages-container">
              <div className="messages-box">
                <div className="card-body msg-card-body">
                  {activeChats[[username, currentRecipient].sort().join('-')]?.map((msg, index) => (
                    <div key={index} className={msg.sender === username ? 'd-flex justify-content-start flex-row-reverse' : 'd-flex justify-content-start mb-4'}>
                      <div className="img-cont-msg">
                        {users.find(user => user.username === msg.sender)?.profilePicture && (
                          <img
                            src={getProfilePictureUrl(users.find(user => user.username === msg.sender)!.profilePicture)}
                            className="rounded-circle user-img-msg"
                          />
                        )}
                      </div>
                      <div className='d-flex flex-column'>
                        <div className="msg-cotainer">
                          <span className='msg-content'>{msg.sender}</span>
                          <span>{msg.message}</span>
                        </div>
                        <span className={msg.sender === username ? 'msg-time-sent' : "msg-time-received"}>{msg.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <form className="message-form" onSubmit={(e: FormEvent) => {
                e.preventDefault();
                const target = e.target as HTMLFormElement;
                const input = target.querySelector('.message-input') as HTMLInputElement;
                if (input.value) {
                  sendMessage(input.value);
                  input.value = '';
                }
              }}>
                <input
                  type="text"
                  className="message-input"
                  placeholder="Type a message..."
                />
                <button className="message-submit" type="submit">▲</button>
              </form>
            </div>
          </>
        )}
      </section>
      {showAboutContainer && (
        <section className="about-container">
          <div className="about-info">
            <img
              className="chat-picture"
              src={currentRecipientUser ? getProfilePictureUrl(currentRecipientUser.profilePicture) : ''}
              alt="group-pic"
            />
            <div>Group Title</div>
            <div className="bio">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur ipsum mauris, tristique et turpis sit amet, vestibulum consequat ante. Vestibulum eu augue at lectus semper vestibulum ut quis est. Interdum et malesuada fames ac ante ipsum primis in faucibus.</div>
          </div>
        </section>
      )}
    </div>
  );
};

export default ChatsPage;
