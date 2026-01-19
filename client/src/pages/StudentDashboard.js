import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import ReactPlayer from 'react-player';
import './Dashboard.css';

const StudentDashboard = () => {
  const { user, logout, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
  const [videos, setVideos] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videosLoading, setVideosLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Wait until auth state is resolved before calling protected endpoints
    if (loading) return;

    if (user && user.role !== 'student') {
      navigate('/admin', { replace: true });
      return;
    }

    // Only fetch sections when auth is ready
    fetchSections();
  }, [user, navigate, loading]);

  useEffect(() => {
    // avoid fetching videos until auth is ready
    if (loading) return;

    if (selectedSection) {
      fetchSectionVideos(selectedSection);
    } else {
      fetchAllVideos();
    }
  }, [selectedSection, loading]);

  const fetchSections = async () => {
    try {
      console.log('Fetching sections 1');
      const response = await axios.get('/api/students/sections');
      setSections(response.data.sections);
      if (response.data.sections.length > 0) {
        setSelectedSection(response.data.sections[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch sections:', error);
      setError('Failed to load sections');
    }
  };

  const fetchAllVideos = async () => {
    console.log('Fetching all videos 1');
    setVideosLoading(true);
    try {
      const response = await axios.get('/api/students/videos');
      setVideos(response.data.videos);
    } catch (error) {
      setError('Failed to fetch videos');
    } finally {
      setVideosLoading(false);
    }
  };

  const fetchSectionVideos = async (sectionId) => {
    console.log('Fetching section videos', { sectionId, url: `/api/students/sections/${sectionId}/videos` });
    setVideosLoading(true);
    try {
      const response = await axios.get(`/api/students/sections/${sectionId}/videos`);
      setVideos(response.data.videos);
    } catch (error) {
      setError('Failed to fetch videos');
    } finally {
      setVideosLoading(false);
    }
  };

  const handleVideoSelect = (video) => {
    setSelectedVideo(video);
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Student Portal</h1>
        <div className="header-actions">
          <span>Welcome, {user?.name}</span>
          <button onClick={logout} className="btn btn-secondary">Logout</button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="student-layout">
          <aside className="sections-sidebar">
            <h2>My Sections</h2>
            <div className="section-list">
              <button
                className={selectedSection === null ? 'active' : ''}
                onClick={() => setSelectedSection(null)}
              >
                All Videos
              </button>
              {sections.map(section => (
                <button
                  key={section.id}
                  className={selectedSection === section.id ? 'active' : ''}
                  onClick={() => {
                    console.log('Section clicked', section);
                    setSelectedSection(section.id);
                  }}
                >
                  {section.name}
                </button>
              ))}
            </div>
          </aside>

          <main className="main-content">
            {error && <div className="error-message">{error}</div>}

            {selectedVideo ? (
              <div className="video-player-container">
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="btn btn-secondary"
                  style={{ marginBottom: '20px' }}
                >
                  ← Back to Videos
                </button>
                <div className="card">
                  <h2 className="card-header">{selectedVideo.title}</h2>
                  <p>Section: {selectedVideo.section_name}</p>
                  {selectedVideo.videoUrl ? (
                    <div className="video-wrapper">
                      <ReactPlayer
                        url={selectedVideo.videoUrl}
                        controls
                        width="100%"
                        height="500px"
                        config={{
                          file: {
                            attributes: {
                              controlsList: 'nodownload'
                            }
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="error-message">
                      {selectedVideo.error || 'Video URL not available'}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="videos-container">
                <h2>
                  {selectedSection
                    ? sections.find(s => s.id === selectedSection)?.name + ' Videos'
                    : 'All Videos'}
                </h2>
                {videosLoading ? (
                  <div className="spinner"></div>
                ) : videos.length === 0 ? (
                  <div className="card">
                    <p>No videos available in this section.</p>
                  </div>
                ) : (
                  <div className="video-grid">
                    {videos.map(video => (
                      <div
                        key={video.id}
                        className="video-card"
                        onClick={() => handleVideoSelect(video)}
                      >
                        <div className="video-card-icon">▶</div>
                        <h3>{video.title}</h3>
                        <p>{video.section_name}</p>
                        <p className="video-date">
                          {new Date(video.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
