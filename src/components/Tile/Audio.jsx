import React, {useEffect, useRef} from 'react';

const Audio = ({ stream }) => {
  const audioElement = useRef();

  useEffect(() => {
    console.log(stream)
    if (audioElement.current && stream && !audioElement.current.srcObject) {
      audioElement.current.srcObject = stream
      // viewer mode safari not working autoplay without get user media
      audioElement.current.play();
    }
  })

  return (
      <audio
        ref={audioElement}
        autoPlay
        playsInline
        style={{
          opacity: '1'
        }}
      />
  );
};

export default Audio;
