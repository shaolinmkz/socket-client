import React, { useState, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom'
import socket from 'socket.io-client';
import chatIcon from './assets/chat-icon.png';
import linkIcon from './assets/link-solid.svg';
import generateID from 'uuid/v4';
import popSound1 from './assets/audio/zapsplat_cartoon_bubble_pop_003_40275.mp3';
import popSound2 from './assets/audio/zapsplat_cartoon_bubble_pop_multiple_fast_001_40280.mp3';
import popSound3 from './assets/audio/zapsplat_cartoon_pop_bubble_etc_001_45556.mp3';


const ChatBox = () => {
  const { push, location: { search } } = useHistory();

  const host = new URLSearchParams(search);


  const generateOrGetCboxID = () => {
    const cBoxID = sessionStorage.getItem('cBoxID');
    
    if(!cBoxID) {
      sessionStorage.setItem('cBoxID', generateID());
      return sessionStorage.getItem('cBoxID');
    }
    return cBoxID;
  }

  const generateHostID = () => host.get('hostId') || generateOrGetCboxID();

  const [chatState, setChatState] = useState({
    name: '',
    message: '',
    loading: false,
    hostID: generateHostID(),
    id: generateOrGetCboxID(),
    played: false,
    ran: false,
  });
  const [messagesState, setMessagesState] = useState({
    incomingAction: '',
    messages: JSON.parse(sessionStorage.getItem('chatMessages')) || [],
  });

  const [debouce, setDebouce] = useState({ debouceFunc: () => {} });

  const endpoint = process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : 'https://chat-box-serva.herokuapp.com';

  const io = socket.connect(endpoint);

  const displayContainerRef = useRef(null);

  const sound = new Audio();

  const copyId = () => {
    const input = document.createElement('input');
    input.value = `${window.location.host}/?hostId=${chatState.hostID}`;
    document.body.appendChild(input);
    input.select();
    input.setSelectionRange(0, 99999);
    document.execCommand('copy');
    document.body.removeChild(input);
  }

  const handleTypingEmit = () => {
    io.emit('typing', {
      incomingAction: `${chatState.name} is typing a message...`,
      message: chatState.message,
      id: chatState.id,
      hostID: chatState.hostID,
    });
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    setChatState((prevState) => ({ ...prevState, loading: true }));

    io.emit('chat', {
      name: chatState.name,
      message: chatState.message,
      id: generateID(),
      userId: chatState.id,
      hostID: chatState.hostID,
    });

    sound.src= popSound1;
    sound.play();

    setChatState((prevState) => ({
      ...prevState,
      message: '',
      loading: false,
      played: false,
    }));
  };
  
  const handleChange = ({ target: { name, value }}) => {
    setChatState((prevState) => ({
      ...prevState,
      [name]: value,
    }));

    if(name === 'message') {
      setDebouce((prevState) => ({ ...prevState, debouceFunc: clearTimeout(debouce.debouceFunc) }))
      setDebouce((prevState) => ({ ...prevState, debouceFunc: setTimeout(() => handleTypingEmit(), 1000)}));
    }
  };


  useEffect(() => {
    if(!chatState.ran) {
      if(chatState.hostID) {
        push(`/?hostId=${chatState.hostID}`);
        setChatState((prevChatState) => ({ ...prevChatState, ran: true }));
      } else {
        push(`/?hostId=${chatState.id}`);
        setChatState((prevChatState) => ({ ...prevChatState, ran: true }));
      }
    }
  }, [])

  useEffect(() => {
    io.on(`chat ${chatState.hostID}` , (data) => {
      const tempStoredMessaage = JSON.parse(sessionStorage.getItem('chatMessages')) || [];
      if(!tempStoredMessaage) sessionStorage.setItem('chatMessages', JSON.stringify([]));

      if(chatState.id === data.userId) {
        setChatState((prevState) => ({
          ...prevState,
          loading: false,
          played: false,
        }));
      }
  
        sessionStorage.setItem('chatMessages', JSON.stringify(tempStoredMessaage.concat(data)));
        setMessagesState((prevState) => ({
          ...prevState,
          incomingAction: '',
          messages: prevState.messages.concat(data),
        }));


        sound.src= popSound3;
        sound.play();
        
        setTimeout(() => displayContainerRef.current.scrollTo(0, displayContainerRef.current.scrollHeight + 1000), 200);
    });
  
    io.on(`typing ${chatState.hostID}`, (data) => {
      if(chatState.id !== data.id) {
        setMessagesState((prevState) => ({ ...prevState, incomingAction: data.incomingAction }));

        if(!chatState.played) {
          sound.src= popSound2;
          sound.play();
          setChatState((prevState) => ({ ...prevState, played: true }));
        }
      }
    })
  }, []);

  return (
    <main className="chat-box-wrapper">
      <form className="chat-form" onSubmit={handleSubmit}>
        <span className="chat-link-wrapper" title="click to copy chat link">
          <img src={linkIcon} alt="" onClick={copyId} className="chat-link" />
        </span>
        <figure>
          <img src={chatIcon} alt="" />
        </figure>
          <h1>Chat Box</h1>
          <section className="display-area" ref={displayContainerRef}>
            {
              messagesState.messages.length ? 
              (messagesState.messages.map(({ name, message }) => (
              <div className="chat-message" key={generateID()}>
              <h4>{name}</h4>
              <p>
              {message}
              </p>
            </div>)
              ))
              : <h2>No Messages...</h2>
            }
          </section>
          <em className="incoming-info">
            {messagesState.incomingAction}
          </em>
          <input
            required
            type="text"
            name="name"
            onChange={handleChange}
            className="chat-name"
            placeholder="Enter chat name"
            value={chatState.name}
          />
          <textarea
            disabled={!chatState.name}
            required
            name="message"
            className="chat-input"
            placeholder="Enter message"
            onChange={!chatState.name ? () => {} : handleChange}
            value={chatState.message}
          ></textarea>
          <button type="submit" disabled={!chatState.name} className="send-btn">SEND</button> 
          <div style={{ textAlign: 'center', fontSize: '1.5rem', color: 'rgb(72, 8, 72)'}}>
            <em>click the link above to copy your secure <b>chat link</b> and send to a friend to start chatting</em>
            </div>    
      </form>
    </main>
  );
}

export default ChatBox;
