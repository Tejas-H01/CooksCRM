import React, { useState } from 'react';
import { useEventContext } from '../context/EventContext';
import { Users, Plus, Search, Edit3, Shield, Power, Building2, AlertCircle } from 'lucide-react';
import { BACKEND_ROLES, ROLE_DISPLAY_NAMES } from '../data/mockData';

export const UserHierarchyPage = () => {
  const { users, addUser, updateUserHierarchy, toggleUserActive, updateUserRole, branches } = useEventContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [validationError, setValidationError] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    password: 'password123',
    role: BACKEND_ROLES.REGIONAL_HEAD,
    team: 'North Team',
    branchName: 'Mumbai Central',
    regionName: 'West Region',
    managerName: 'N/A (Regional Head)',
    team_id: null
  });

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAddRegional = () => {
    setEditingUser(null);
    setValidationError('');
    setFormData({
      username: '',
      name: '',
      email: '',
      password: 'password123',
      role: BACKEND_ROLES.REGIONAL_HEAD,
      team: 'West Region',
      branchName: 'All Regional Branches',
      regionName: 'West Region',
      managerName: 'N/A (Regional Head)',
      team_id: null
    });
    setIsAddModalOpen(true);
  };

  const handleOpenAddGeneral = () => {
    setEditingUser(null);
    setValidationError('');
    setFormData({
      username: '',
      name: '',
      email: '',
      password: 'password123',
      role: BACKEND_ROLES.RM,
      team: 'North Team',
      branchName: 'Mumbai Central',
      regionName: 'West Region',
      managerName: 'Anita Verma',
      team_id: null
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setValidationError('');
    setFormData({
      username: user.username || user.name?.toLowerCase().replace(/\s+/g, '_') || '',
      name: user.name || user.username || '',
      email: user.email || '',
      password: 'password123',
      role: user.role || BACKEND_ROLES.RM,
      team: user.team || 'North Team',
      branchName: user.branchName || 'Mumbai Central',
      regionName: user.regionName || 'West Region',
      managerName: user.managerName || 'Anita Verma',
      team_id: user.team_id || null
    });
    setIsAddModalOpen(true);
  };

  const validateForm = () => {
    if (!formData.username.trim()) {
      setValidationError('Username is required.');
      return false;
    }
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      setValidationError('Please enter a valid email address.');
      return false;
    }
    if (!formData.password || formData.password.length < 6) {
      setValidationError('Password must be at least 6 characters.');
      return false;
    }
    if (!formData.role) {
      setValidationError('Please select a valid backend role.');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editingUser) {
        await updateUserHierarchy(editingUser.id, formData);
        if (formData.role !== editingUser.role) {
          await updateUserRole(editingUser.id, formData.role);
        }
      } else {
        await addUser(formData);
      }
      setIsAddModalOpen(false);
    } catch (err) {
      setValidationError(err.message || 'Failed to save user via POST API');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            User & Hierarchy Mapping Management 👥
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Connected to <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-admin)' }}>POST /admin/users</code> & <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-admin)' }}>PATCH /admin/users/{'{id}'}</code>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {/* DEDICATED BUTTON TO ADD REGIONAL MANAGER */}
          <button
            onClick={handleOpenAddRegional}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'var(--accent-regional)',
              border: 'none',
              color: '#fff',
              borderRadius: '8px',
              padding: '0.55rem 1.1rem',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(241, 82, 111, 0.35)'
            }}
          >
            <Building2 size={16} />
            <span>Add Regional Manager</span>
          </button>

          {/* Standard Add User Button */}
          <button
            onClick={handleOpenAddGeneral}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'var(--accent-admin)',
              border: 'none',
              color: '#000',
              borderRadius: '8px',
              padding: '0.55rem 1.1rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Plus size={16} />
            <span>Add User</span>
          </button>
        </div>
      </div>

      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Organizational User Directory & Active Status
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{ color: 'var(--text-muted)', position: 'absolute', left: '10px' }} />
            <input
              type="text"
              placeholder="Search user, email, role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'var(--input-bg)',
                border: '1px solid var(--border-glass)',
                borderRadius: '6px',
                padding: '0.4rem 0.75rem 0.4rem 2rem',
                color: 'var(--text-main)',
                fontSize: '0.82rem',
                width: '240px'
              }}
            />
          </div>
        </div>

        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Backend Role</th>
                <th>Region</th>
                <th>Branch & Team</th>
                <th>Reporting Manager</th>
                <th>Status (`is_active`)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const isActive = u.is_active !== false && u.status !== 'Inactive';
                const roleCode = u.role || 'RM';
                return (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      <div>{u.name || u.username}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.email}</div>
                    </td>
                    <td style={{ fontWeight: 700, color: roleCode === 'REGIONAL_HEAD' ? 'var(--accent-regional)' : 'var(--accent-admin)' }}>
                      {ROLE_DISPLAY_NAMES[roleCode] || roleCode}
                    </td>
                    <td>{u.regionName || u.region_id || 'West Region'}</td>
                    <td>
                      {(() => {
                        const teamObj = branches?.find(b => b.id === u.team_id);
                        return teamObj ? teamObj.name : 'Unassigned';
                      })()}
                    </td>
                    <td style={{ fontWeight: 600 }}>{u.managerName || u.manager_id || 'Anita Verma'}</td>
                    <td>
                      <span
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: isActive ? 'rgba(1,154,107,0.15)' : 'rgba(225,29,72,0.15)',
                          color: isActive ? 'var(--accent-rm)' : 'var(--accent-regional)'
                        }}
                      >
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => handleOpenEdit(u)}
                          style={{
                            background: 'rgba(2, 132, 197, 0.15)',
                            border: '1px solid rgba(2, 132, 197, 0.3)',
                            color: 'var(--accent-manager)',
                            borderRadius: '6px',
                            padding: '0.25rem 0.55rem',
                            cursor: 'pointer'
                          }}
                          title="Edit User Hierarchy"
                        >
                          <Edit3 size={14} />
                        </button>
                        
                        <button
                          onClick={() => toggleUserActive(u.id, isActive)}
                          style={{
                            background: isActive ? 'rgba(225, 29, 72, 0.15)' : 'rgba(1, 154, 107, 0.15)',
                            border: `1px solid ${isActive ? 'var(--accent-regional)' : 'var(--accent-rm)'}`,
                            color: isActive ? 'var(--accent-regional)' : 'var(--accent-rm)',
                            borderRadius: '6px',
                            padding: '0.25rem 0.55rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                          title={isActive ? "Deactivate User" : "Activate User"}
                        >
                          <Power size={13} />
                          <span>{isActive ? 'Deactivate' : 'Activate'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={20} style={{ color: formData.role === BACKEND_ROLES.REGIONAL_HEAD ? 'var(--accent-regional)' : 'var(--accent-admin)' }} />
                <span>
                  {editingUser 
                    ? `Edit Hierarchy for ${editingUser.name || editingUser.username}` 
                    : formData.role === BACKEND_ROLES.REGIONAL_HEAD 
                    ? 'Add New Regional Manager (POST /admin/users)' 
                    : 'Add New User (POST /admin/users)'}
                </span>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>
                ✕
              </button>
            </div>

            {/* Validation Error Alert */}
            {validationError && (
              <div
                style={{
                  background: 'rgba(241, 82, 111, 0.12)',
                  border: '1px solid rgba(241, 82, 111, 0.35)',
                  borderRadius: '8px',
                  padding: '0.75rem 0.85rem',
                  color: 'var(--accent-regional)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <AlertCircle size={16} />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 700 }}>
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. sanjay_singhania"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', background: 'var(--input-bg)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 700 }}>
                    Full Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sanjay Singhania"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', background: 'var(--input-bg)', border: '1px solid var(--border-glass)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 700 }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. sanjay@salesorbit.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', background: 'var(--input-bg)', border: '1px solid var(--border-glass)', color: 'var(--text-main)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 700 }}>
                    Initial Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', background: 'var(--input-bg)', border: '1px solid var(--border-glass)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 700 }}>
                  Assigned Backend Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', background: 'var(--input-bg)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', fontWeight: 700 }}
                >
                  <option value={BACKEND_ROLES.REGIONAL_HEAD}>REGIONAL_HEAD (Regional Head / Manager)</option>
                  <option value={BACKEND_ROLES.BRANCH_MANAGER}>BRANCH_MANAGER (Branch Manager)</option>
                  <option value={BACKEND_ROLES.RM}>RM (Relationship Manager)</option>
                  <option value={BACKEND_ROLES.ADMIN}>ADMIN (Overall Admin)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>
                    Assigned Region / Territory
                  </label>
                  <select
                    value={formData.regionName}
                    onChange={(e) => setFormData({ ...formData, regionName: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', background: 'var(--input-bg)', border: '1px solid var(--border-glass)', color: 'var(--text-main)' }}
                  >
                    <option value="West Region">West Region</option>
                    <option value="North Region">North Region</option>
                    <option value="South Region">South Region</option>
                    <option value="East Region">East Region</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>
                    Branch / Team Mapping
                  </label>
                  <select
                    value={formData.branchName}
                    onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', background: 'var(--input-bg)', border: '1px solid var(--border-glass)', color: 'var(--text-main)' }}
                  >
                    <option value="All Regional Branches">All Regional Branches</option>
                    <option value="Mumbai Central">Mumbai Central</option>
                    <option value="Delhi West">Delhi West</option>
                    <option value="Bangalore South">Bangalore South</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', background: 'var(--input-bg)', border: 'none', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.6rem 1.2rem',
                    borderRadius: '6px',
                    background: formData.role === BACKEND_ROLES.REGIONAL_HEAD ? 'var(--accent-regional)' : 'var(--accent-admin)',
                    border: 'none',
                    color: formData.role === BACKEND_ROLES.REGIONAL_HEAD ? '#fff' : '#000',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                >
                  {editingUser ? 'Save Changes' : 'Create User (POST /admin/users)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
