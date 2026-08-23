import { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { requestPermission } from "../../services/notifications.js";

export default function NotificationSettings() {
  const { user, updateNotifications } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const enabled = user?.notifications?.enabled ?? false;
  const daysBefore = user?.notifications?.daysBefore ?? 2;

  const handleToggle = async () => {
    setError(null);

    if (!enabled) {
      const granted = await requestPermission();
      if (!granted) {
        setError("Notifications are blocked — allow them for this app/site in your device or browser settings.");
        return;
      }
    }

    setSaving(true);
    try {
      await updateNotifications({ enabled: !enabled });
    } catch {
      setError("Couldn't save that setting. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDaysChange = async (e) => {
    setSaving(true);
    setError(null);
    try {
      await updateNotifications({ daysBefore: Number(e.target.value) });
    } catch {
      setError("Couldn't save that setting. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="notification-settings">
      <label className="notification-toggle">
        <input type="checkbox" checked={enabled} onChange={handleToggle} disabled={saving} />
        🔔 Remind me before things expire
      </label>

      {enabled && (
        <label className="notification-days">
          Remind me
          <select value={daysBefore} onChange={handleDaysChange} disabled={saving}>
            <option value={0}>on the day</option>
            <option value={1}>1 day before</option>
            <option value={2}>2 days before</option>
            <option value={3}>3 days before</option>
            <option value={5}>5 days before</option>
            <option value={7}>1 week before</option>
          </select>
        </label>
      )}

      {error && <p className="notification-error">{error}</p>}
    </div>
  );
}
