import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Bell, LogOut } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { ActivityLog, Notification, Priority, Project, Task, TaskStatus } from '../types';

const statuses: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'OVERDUE'];
const priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export function DashboardPage() {
  const { user, logout } = useAuth();
  const { socket, onlineCount } = useSocket();
  const [search, setSearch] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);

  const selectedProjectId = search.get('projectId') || '';
  const status = search.get('status') || '';
  const priority = search.get('priority') || '';
  const dueAfter = search.get('dueAfter') || '';
  const dueBefore = search.get('dueBefore') || '';

  const loadAll = async () => {
    const [projectsRes, summaryRes, activityRes, notificationsRes] = await Promise.all([
      api.get('/projects'),
      api.get('/dashboards/summary'),
      api.get('/activity'),
      api.get('/notifications'),
    ]);
    setProjects(projectsRes.data.data);
    setSummary(summaryRes.data.data);
    setActivity(activityRes.data.data);
    setNotifications(notificationsRes.data.data.notifications);
    setUnreadCount(notificationsRes.data.data.unreadCount);
  };

  const loadTasks = async () => {
    if (!selectedProjectId) return setTasks([]);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (priority) params.set('priority', priority);
    if (dueAfter) params.set('dueAfter', dueAfter);
    if (dueBefore) params.set('dueBefore', dueBefore);
    const res = await api.get(`/projects/${selectedProjectId}/tasks?${params.toString()}`);
    setTasks(res.data.data);
  };

  useEffect(() => {
    loadAll();
    const lastSeen = localStorage.getItem('lastActivitySeenAt');
    if (lastSeen) {
      api.get(`/activity/missed?since=${encodeURIComponent(lastSeen)}`).then((res) => {
        if (res.data.data?.length) setActivity((prev) => [...res.data.data, ...prev].slice(0, 50));
      });
    }
    localStorage.setItem('lastActivitySeenAt', new Date().toISOString());
  }, []);

  useEffect(() => {
    loadTasks();
  }, [selectedProjectId, status, priority, dueAfter, dueBefore]);

  useEffect(() => {
    if (!socket) return;
    const onTaskUpdated = (event: ActivityLog) => {
      setActivity((prev) => [event, ...prev].slice(0, 50));
      if ((event as any).task?.projectId === selectedProjectId) loadTasks();
    };
    const onNewNotif = () => {
      api.get('/notifications').then((res) => {
        setNotifications(res.data.data.notifications);
        setUnreadCount(res.data.data.unreadCount);
      });
    };
    const onNotifCount = ({ unreadCount }: { unreadCount: number }) => setUnreadCount(unreadCount);
    socket.on('task:updated', onTaskUpdated);
    socket.on('notification:new', onNewNotif);
    socket.on('notification:count', onNotifCount);
    return () => {
      socket.off('task:updated', onTaskUpdated);
      socket.off('notification:new', onNewNotif);
      socket.off('notification:count', onNotifCount);
    };
  }, [socket, selectedProjectId]);

  const assignedForDev = useMemo(() => {
    const list: Task[] = summary?.assignedTasks || [];
    return list.filter((t) => {
      if (status && t.status !== status) return false;
      if (priority && t.priority !== priority) return false;
      if (dueAfter && (!t.dueDate || new Date(t.dueDate) < new Date(dueAfter))) return false;
      if (dueBefore && (!t.dueDate || new Date(t.dueDate) > new Date(dueBefore))) return false;
      return true;
    });
  }, [summary, status, priority, dueAfter, dueBefore]);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(search);
    if (!value) next.delete(key);
    else next.set(key, value);
    setSearch(next);
  };

  const updateTaskStatus = async (taskId: string, nextStatus: TaskStatus) => {
    await api.put(`/tasks/${taskId}`, { status: nextStatus });
    loadTasks();
  };

  const markRead = async (id: string) => {
    await api.put(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo"><div className="sidebar-logo-text">Velocity</div></div>
        <div className="sidebar-nav">
          <div className="nav-label">Filters</div>
          <select className="select" value={selectedProjectId} onChange={(e) => setFilter('projectId', e.target.value)}>
            <option value="">Select Project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select className="select" value={status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">All Status</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="select" value={priority} onChange={(e) => setFilter('priority', e.target.value)}>
            <option value="">All Priority</option>
            {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input className="input" type="date" value={dueAfter} onChange={(e) => setFilter('dueAfter', e.target.value)} />
          <input className="input" type="date" value={dueBefore} onChange={(e) => setFilter('dueBefore', e.target.value)} />
        </div>
      </aside>
      <div className="w-full">
        <header className="topbar">
          <div>
            <strong>{user?.role} Dashboard</strong>
            {user?.role === 'ADMIN' ? <span className="presence-badge" style={{ marginLeft: 12 }}><span className="presence-dot" />Online: {onlineCount}</span> : null}
          </div>
          <div className="topbar-right">
            <div className="notif-bell">
              <button className="btn-icon" onClick={() => setNotifOpen((v) => !v)}><Bell size={16} /></button>
              {unreadCount > 0 ? <span className="notif-badge">{unreadCount}</span> : null}
              {notifOpen ? (
                <div className="notif-dropdown">
                  <div className="notif-header">
                    <strong>Notifications</strong>
                    <button className="btn btn-ghost" onClick={markAllRead}>Mark all read</button>
                  </div>
                  <div className="notif-list">
                    {notifications.map((n) => (
                      <div key={n.id} className={`notif-item ${n.isRead ? '' : 'unread'}`} onClick={() => markRead(n.id)}>
                        <div className={`notif-dot ${n.isRead ? 'read' : ''}`} />
                        <div>
                          <div>{n.message}</div>
                          <div className="activity-time">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <button className="btn btn-danger" onClick={logout}><LogOut size={16} />Logout</button>
          </div>
        </header>
        <main className="main-content">
          <div className="grid-3 mb-4">
            {user?.role === 'ADMIN' ? (
              <>
                <div className="stat-card"><div><div className="stat-label">Projects</div><div className="stat-value">{summary?.totalProjects || 0}</div></div></div>
                <div className="stat-card"><div><div className="stat-label">Overdue</div><div className="stat-value">{summary?.totalOverdue || 0}</div></div></div>
                <div className="stat-card"><div><div className="stat-label">In Progress</div><div className="stat-value">{summary?.tasksByStatus?.IN_PROGRESS || 0}</div></div></div>
              </>
            ) : user?.role === 'PM' ? (
              <>
                <div className="stat-card"><div><div className="stat-label">My Projects</div><div className="stat-value">{summary?.totalProjects || 0}</div></div></div>
                <div className="stat-card"><div><div className="stat-label">Critical Tasks</div><div className="stat-value">{summary?.tasksByPriority?.CRITICAL || 0}</div></div></div>
                <div className="stat-card"><div><div className="stat-label">Due This Week</div><div className="stat-value">{summary?.upcomingDueDates?.length || 0}</div></div></div>
              </>
            ) : (
              <>
                <div className="stat-card"><div><div className="stat-label">Assigned Tasks</div><div className="stat-value">{assignedForDev.length}</div></div></div>
              </>
            )}
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="section-header"><div className="section-title">Tasks</div></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Title</th><th>Status</th><th>Priority</th><th>Due</th><th>Action</th></tr></thead>
                  <tbody>
                    {(user?.role === 'DEVELOPER' ? assignedForDev : tasks).map((t) => (
                      <tr key={t.id}>
                        <td>{t.title}</td>
                        <td><span className={`badge status-${t.status}`}>{t.status}</span></td>
                        <td><span className={`badge priority-${t.priority}`}>{t.priority}</span></td>
                        <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '-'}</td>
                        <td>
                          {(user?.role === 'DEVELOPER' || user?.role === 'PM' || user?.role === 'ADMIN') ? (
                            <select className="select" value={t.status} onChange={(e) => updateTaskStatus(t.id, e.target.value as TaskStatus)}>
                              {statuses.filter((s) => s !== 'OVERDUE').map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card">
              <div className="section-header"><div className="section-title">Live Activity Feed</div></div>
              <div className="activity-list">
                {activity.slice(0, 20).map((a) => (
                  <div key={a.id} className="activity-item">
                    <div className="activity-avatar">{a.user?.name?.slice(0, 1)}</div>
                    <div className="activity-content">
                      <div className="activity-message">{a.message}</div>
                      <div className="activity-time">
                        {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
