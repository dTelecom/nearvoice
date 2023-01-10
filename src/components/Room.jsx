import User from '../components/Tile/User';
import Audio from '../components/Tile/Audio';
import {useLocation, useNavigate, useParams} from 'react-router-dom';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import AudioButton from '../components/Buttons/AudioButton';
import LeaveButton from '../components/Buttons/LeaveButton';
import UserCount from '../components/Buttons/UserCount';

import {IonSFUJSONRPCSignal} from 'js-sdk/lib/signal/json-rpc-impl';
import {LocalStream} from 'js-sdk/lib/stream';
import Client from 'js-sdk/lib/client';

const config = {
  encodedInsertableStreams: false, iceServers: [{
    urls: 'stun:stun.l.google.com:19302',
  },],
};

const Room = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const clientLocal = useRef();
  const signalLocal = useRef();
  const localMedia = useRef();
  const [audioMuted, setAudioMuted] = useState(true);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [participants, setParticipants] = useState({});
  const [streams, setStreams] = useState({});
  const {sid} = useParams();

  useEffect(() => {
    if (location.state === null) {
      navigate(`/join/${sid}`);
    } else {
      join();
    }
  }, []);

  useEffect(() => {
    sendState();
  }, [audioMuted]);

  const leave = useCallback(() => {
    if (clientLocal.current) {
      clientLocal.current.signal.call('end', {});
      clientLocal.current.close();
      clientLocal.current = null;
      navigate('/');
    }
  }, [navigate]);

  const sendState = useCallback(() => {
    if (signalLocal.current?.socket.readyState === 1) {
      console.log('[sendState]', 'audio muted: ' + audioMuted);

      signalLocal.current.notify('muteEvent', {
        muted: audioMuted, kind: 'audio'
      });
    }
  }, [audioMuted]);

  const publish = useCallback(async () => {
    LocalStream.getUserMedia({
      audio: true,
      video: false,
      sendEmptyOnMute: false,
    }).then(async (media) => {
      media.mute('audio');      
      localMedia.current = media;

      await clientLocal.current.publish(media);
    })
      .catch(console.error);
  }, [audioMuted]);

  const join = useCallback(() => {
    const _signalLocal = new IonSFUJSONRPCSignal(location.state.url);
    signalLocal.current = _signalLocal;

    const _clientLocal = new Client(_signalLocal, config);
    clientLocal.current = _clientLocal;

    _clientLocal.onerrnegotiate = () => {
      leave();
    };

    _clientLocal.ontrack = (track, stream) => {
      console.log('[got track]', track, 'for stream', stream);

      setStreams(prev => (
        {
          ...prev,
          [stream.id]: stream
        }
      ));

      stream.onremovetrack = () => {
        console.log('[onremovetrack]', stream.id);
        setStreams(prev => {
          const newState = {...prev};
          delete newState[stream.id];
          return newState;
        });
      };
    };

    _signalLocal.onopen = async () => {
      clientLocal.current.join(location.state.token, location.state.signature);
      sendState();
      void publish();
    };

    _signalLocal.on_notify('onJoin', onJoin);
    _signalLocal.on_notify('onLeave', onLeave);
    _signalLocal.on_notify('onStream', onStream);
    _signalLocal.on_notify('participants', onParticipantsEvent);
    _signalLocal.on_notify('muteEvent', onMuteEvent);
    _signalLocal.on_notify('participantsCount', onParticipantsCount);
  }, []);

  const onJoin = ({participant}) => {
    console.log('[onJoin]', participant);

    setParticipants(prev => (
      {
        ...prev,
        [participant.uid]: participant
      }
    ));
  };

  const onLeave = ({participant}) => {
    console.log('[onLeave]', participant);

    setParticipants(prev => {
      const newState = {...prev};
      delete newState[participant.uid];
      return newState;
    });
  };

  const onParticipantsEvent = (participants) => {
    console.log('[onParticipantsEvent]', participants);

    const newParticipants = {};
    Object.values(participants).forEach(participant => {
      newParticipants[participant.uid] = participant;
    });
    setParticipants(prev => ({
      ...prev,
      ...newParticipants,
    }));
  };

  const onStream = ({participant}) => {
    console.log('[onStream]', participant);

    setParticipants(prev => (
      {
        ...prev,
        [participant.uid]: participant
      }
    ));
  };

  const onMuteEvent = ({participant, payload}) => {
    console.log('[onMuteEvent]', participant, payload);

    setParticipants(prev => (
      {
        ...prev,
        [participant.uid]: participant
      }
    ));
  };

  const onParticipantsCount = (data) => {
    console.log('[onParticipantsCount]', data);
    setParticipantsCount(data.payload.participantsCount+data.payload.viewersCount)
  };

  const toggleMute = useCallback(() => {
    if (audioMuted) {
      localMedia.current.unmute('audio');
    } else {
      localMedia.current.mute('audio');
    }
    setAudioMuted(!audioMuted)
  }, [localMedia,audioMuted]);


  return (
    <div className='flex flex-col pt-4'>
      <div className='flex justify-between items-start'>
        <div className='flex flex-wrap justify-center items-start w-full '>
          {Object.keys(participants).map((key, i) => (
            <User key={participants[key].uid} peer={participants[key]} />
          ))}
          {Object.keys(streams).map((key, i) => (
            <Audio key={streams[key].id} stream={streams[[key]]}/>
          ))}
        </div>
      </div>
      <footer className='flex h-20 bg-gray-100 fixed bottom-0 space-x-4 left-0 w-full items-center justify-center'>
        <AudioButton
          active={!audioMuted}
          onClick={() => {
            toggleMute();
          }}
        />
        <LeaveButton
          onClick={() => {
            leave();
          }}
        />
        <UserCount count={participantsCount} />
      </footer>
    </div>
  );
};

export default Room;
