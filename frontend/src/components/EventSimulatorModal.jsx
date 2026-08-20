import React, { useState } from 'react';
import { useEventContext } from '../context/EventContext';
import { Zap, DollarSign, Clock, Flame, UserPlus, Play, Check } from 'lucide-react';

export const EventSimulatorModal = () => {
  const { isSimulatorOpen, setIsSimulatorOpen, triggerEvent } = useEventContext();
  const [selectedType, setSelectedType] = useState('PAYIN_RECEIVED');
  const [customPayload, setCustomPayload] = useState('{\n  "leadName": "Aarav Mehta",\n  "amount": 500000\n}');

  if (!isSimulatorOpen) return null;

  const presets = [
    {
      id: 'PAYIN_RECEIVED',
      title: 'Pay-in Received',
      icon: DollarSign,
      color: '#01c58a',
      desc: 'Customer makes ₹5L investment deposit. Generates urgent conversion action.',
      payload: '{\n  "leadName": "Aarav Mehta",\n  "amount": 500000\n}'
    },
    {
      id: 'SLA_BREACH',
      title: 'SLA Breach Warning',
      icon: Clock,
      color: '#f1526f',
      desc: 'Lead uncontacted for >36h. Triggers priority breach alert & manager escalation.',
      payload: '{\n  "leadName": "Pooja Desai",\n  "hours": 36\n}'
    },
    {
      id: 'DIGITAL_HIGH_INTENT',
      title: 'Digital High Intent',
      icon: Flame,
      color: '#3ea4f5',
      desc: 'Customer viewed investment calculator 4 times today. Boosts lead score & rank.',
      payload: '{\n  "leadName": "Vikram Patel",\n  "activity": "Calculator 4x"\n}'
    },
    {
      id: 'NEW_LEAD',
      title: 'New Inbound Lead',
      icon: UserPlus,
      color: '#fca004',
      desc: 'New high-value inquiry assigned to RM. Starts initial contact SLA timer.',
      payload: '{\n  "name": "Kavita Rao",\n  "email": "kavita.rao@example.com",\n  "value": 1500000\n}'
    }
  ];

  const handleSelectPreset = (p) => {
    setSelectedType(p.id);
    setCustomPayload(p.payload);
  };

  const handleFireEvent = (e) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(customPayload);
      triggerEvent(selectedType, parsed);
      setIsSimulatorOpen(false);
    } catch (err) {
      alert("Invalid JSON payload: " + err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setIsSimulatorOpen(false)}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #01c58a, #3ea4f5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000'
              }}
            >
              <Zap size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                Real-Time Event Simulator Dock
              </div>
              <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                Ingest synthetic business events to observe real-time priority action updates
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsSimulatorOpen(false)}
            style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Event Presets Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {presets.map((p) => {
            const IconComp = p.icon;
            const isSelected = selectedType === p.id;
            return (
              <div
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                style={{
                  background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  border: isSelected ? `2px solid ${p.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: p.color, fontWeight: 700, fontSize: '0.88rem' }}>
                    <IconComp size={16} />
                    <span>{p.title}</span>
                  </div>
                  {isSelected && <Check size={16} style={{ color: p.color }} />}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', lineHeight: 1.3 }}>{p.desc}</div>
              </div>
            );
          })}
        </div>

        {/* JSON Payload Editor */}
        <form onSubmit={handleFireEvent}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', color: '#9ca3af', marginBottom: '0.4rem', fontWeight: 600 }}>
              Event Payload (JSON)
            </label>
            <textarea
              rows={4}
              value={customPayload}
              onChange={(e) => setCustomPayload(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '0.75rem',
                color: '#01c58a',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setIsSimulatorOpen(false)}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.4rem',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #01c58a, #3ea4f5)',
                border: 'none',
                color: '#000',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 0 16px rgba(1, 197, 138, 0.4)'
              }}
            >
              <Play size={16} fill="#000" />
              <span>Emit Live Business Event</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
