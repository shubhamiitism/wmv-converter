'use client';
import React, { useState, useEffect, useRef } from 'react';
import '../styles/styles.css';

const wmvConverter = () => {
    const [videoFile, setVideoFile] = useState(null);
    const [videoDuration, setVideoDuration] = useState(null);
    const [loaded, setLoaded] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [downloadLink, setDownloadLink] = useState('');
    const ffmpegRef = useRef(null);

    const handleVideoUpload = (e) => {
        const file = e.target.files[0];
        setVideoFile(file);
        
        // Create a video element to extract the duration
        const videoElement = document.createElement('video');
        videoElement.preload = 'metadata';
        videoElement.onloadedmetadata = () => {
            console.log('Video duration:', videoElement.duration);
            setVideoDuration(videoElement.duration);
        };
        videoElement.src = URL.createObjectURL(file);
        console.log("Video uploaded...");
    };

    useEffect(() => {
        const loadFFmpeg = async () => {
            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
            const { FFmpeg } = await import('@ffmpeg/ffmpeg');
            const { toBlobURL } = await import('@ffmpeg/util');
            const ffmpeg = new FFmpeg();
            ffmpegRef.current = ffmpeg;
            ffmpeg.on('log', ({ message }) => {
                console.log('FFmpeg log:', message);
                const timeMatch = message.match(/time=\s*(\d+:\d+:\d+\.\d+)/);
                if (timeMatch) {
                    const [hours, minutes, seconds] = timeMatch[1].split(':').map(parseFloat);
                    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
                    console.log('Total seconds processed:', totalSeconds);
                    let progressValue= 0;
                    if (videoDuration) {
                        progressValue = (totalSeconds / videoDuration) * 100;
                        console.log('Progress value:', progressValue);
                        setProgress(progressValue);
                    }
                }
            });
            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });
            setLoaded(true);
        };

        loadFFmpeg();
    }, [videoDuration]);

    const triggerDownload = (url, filename) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const transcode = async () => {
        setProcessing(true);
        setProgress(0);
        try {
            const ffmpeg = ffmpegRef.current;
            const { fetchFile } = await import('@ffmpeg/util');
            await ffmpeg.writeFile('input', await fetchFile(videoFile));

            await ffmpeg.exec(['-i', 'input', 'output.wmv']);
            
            const data = await ffmpeg.readFile('output.wmv');
            const videoURL = URL.createObjectURL(new Blob([data.buffer], { type: 'video/wmv' }));
            setDownloadLink(videoURL);

            // Automatically trigger download
            triggerDownload(videoURL, 'output.wmv');
        } catch (error) {
            console.error('Error during FFmpeg command execution:', error);
        }
        setProcessing(false);
        setProgress(100);
    };

    return (
        <div className="container">
            <h1>Convert Video to wmv</h1>
            <div className="upload-container">
                <label htmlFor="video">Upload video file:</label>
                <input className="upload-btn" type="file" id="video" accept="video/*" onChange={handleVideoUpload} />
            </div>
            {loaded && (
                <div className="actions">
                    {processing ? (
                        <div>
                            <div className="loader">Processing...</div>
                            <div className="progress-bar">
                                <div className="progress" style={{ width: `${progress}%` }}>
                                    {Math.round(progress)}%
                                </div>
                            </div>
                        </div>
                    ) : (
                        <button className="merge-btn" onClick={transcode}>Convert to wmv</button>
                    )}
                </div>
            )}
        </div>
    );
};

export default wmvConverter;