import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import './Dashboard.css';

const AdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('videos');
  const [videos, setVideos] = useState([]);
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [videoForm, setVideoForm] = useState({ title: '', sectionId: '', video: null });
  const [studentForm, setStudentForm] = useState({ name: '', email: '', password: '', sectionIds: [] });

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/student', { replace: true });
    }
    fetchSections();
    if (activeTab === 'videos') fetchVideos();
    if (activeTab === 'students') fetchStudents();
  }, [user, navigate, activeTab]);

  const fetchSections = async () => {
    try {
      const response = await axios.get('/api/sections');
      setSections(response.data.sections);
    } catch (error) {
      console.error('Failed to fetch sections:', error);
    }
  };

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/videos');
      setVideos(response.data.videos);
    } catch (error) {
      setError('Failed to fetch videos');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/students');
      setStudents(response.data.students);
    } catch (error) {
      setError('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoUpload = async (e) => {
    e.preventDefault();
    if (!videoForm.video) {
      setError('Please select a video file');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('video', videoForm.video);
    formData.append('title', videoForm.title);
    formData.append('sectionId', videoForm.sectionId);

    try {
      await axios.post('/api/admin/videos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess('Video uploaded successfully');
      setVideoForm({ title: '', sectionId: '', video: null });
      fetchVideos();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to upload video');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.post('/api/admin/students', studentForm);
      setSuccess('Student created successfully');
      setStudentForm({ name: '', email: '', password: '', sectionIds: [] });
      fetchStudents();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create student');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideo = async (id) => {
    if (!window.confirm('Are you sure you want to delete this video?')) return;

    try {
      await axios.delete(`/api/admin/videos/${id}`);
      setSuccess('Video deleted successfully');
      fetchVideos();
    } catch (error) {
      setError('Failed to delete video');
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;

    try {
      await axios.delete(`/api/admin/students/${id}`);
      setSuccess('Student deleted successfully');
      fetchStudents();
    } catch (error) {
      setError('Failed to delete student');
    }
  };

  const handleSectionToggle = (sectionId) => {
    setStudentForm(prev => ({
      ...prev,
      sectionIds: prev.sectionIds.includes(sectionId)
        ? prev.sectionIds.filter(id => id !== sectionId)
        : [...prev.sectionIds, sectionId]
    }));
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <div className="header-actions">
          <span>Welcome, {user?.name}</span>
          <button onClick={logout} className="btn btn-secondary">Logout</button>
        </div>
      </header>

      <div className="dashboard-content">
        <nav className="dashboard-nav">
          <button
            className={activeTab === 'videos' ? 'active' : ''}
            onClick={() => setActiveTab('videos')}
          >
            Videos
          </button>
          <button
            className={activeTab === 'students' ? 'active' : ''}
            onClick={() => setActiveTab('students')}
          >
            Students
          </button>
        </nav>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {activeTab === 'videos' && (
          <div className="tab-content">
            <div className="card">
              <h2 className="card-header">Upload Video</h2>
              <form onSubmit={handleVideoUpload}>
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={videoForm.title}
                    onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Section</label>
                  <select
                    value={videoForm.sectionId}
                    onChange={(e) => setVideoForm({ ...videoForm, sectionId: e.target.value })}
                    required
                  >
                    <option value="">Select a section</option>
                    {sections.map(section => (
                      <option key={section.id} value={section.id}>{section.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Video File</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoForm({ ...videoForm, video: e.target.files[0] })}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Uploading...' : 'Upload Video'}
                </button>
              </form>
            </div>

            <div className="card">
              <h2 className="card-header">All Videos</h2>
              {loading ? (
                <div className="spinner"></div>
              ) : videos.length === 0 ? (
                <p>No videos uploaded yet.</p>
              ) : (
                <div className="video-list">
                  {videos.map(video => (
                    <div key={video.id} className="video-item">
                      <div>
                        <h3>{video.title}</h3>
                        <p>Section: {video.section_name}</p>
                        <p>Uploaded by: {video.uploaded_by_name}</p>
                        <p>Uploaded: {new Date(video.created_at).toLocaleDateString()}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteVideo(video.id)}
                        className="btn btn-danger"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="tab-content">
            <div className="card">
              <h2 className="card-header">Add Student</h2>
              <form onSubmit={handleCreateStudent}>
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={studentForm.name}
                    onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={studentForm.email}
                    onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={studentForm.password}
                    onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
                <div className="form-group">
                  <label>Assign Sections</label>
                  <div className="checkbox-group">
                    {sections.map(section => (
                      <label key={section.id} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={studentForm.sectionIds.includes(section.id)}
                          onChange={() => handleSectionToggle(section.id)}
                        />
                        {section.name}
                      </label>
                    ))}
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Student'}
                </button>
              </form>
            </div>

            <div className="card">
              <h2 className="card-header">All Students</h2>
              {loading ? (
                <div className="spinner"></div>
              ) : students.length === 0 ? (
                <p>No students registered yet.</p>
              ) : (
                <div className="student-list">
                  {students.map(student => (
                    <div key={student.id} className="student-item">
                      <div>
                        <h3>{student.name}</h3>
                        <p>Email: {student.email}</p>
                        <p>Assigned Sections: {student.assigned_sections || 'None'}</p>
                        <p>Registered: {new Date(student.created_at).toLocaleDateString()}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteStudent(student.id)}
                        className="btn btn-danger"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
