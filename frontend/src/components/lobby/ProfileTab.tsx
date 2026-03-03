import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store';
import { logout } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LogOut, Shield, Star, Wallet } from 'lucide-react';

export function ProfileTab() {
  const navigate = useNavigate();
  const balance = useGameStore((s) => s.balance);
  const currency = useGameStore((s) => s.currency);
  const setToken = useGameStore((s) => s.setToken);

  const handleLogout = () => {
    logout().catch(() => undefined);
    setToken('');
    navigate('/login', { replace: true });
  };

  return (
    <div className="profile-tab">
      <div className="profile-grid">
        <Card>
          <CardHeader>
            <CardTitle
              className="text-lg flex items-center gap-2"
              style={{
                fontFamily: "'Rajdhani', monospace",
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              <Wallet style={{ width: 18, height: 18, color: '#62d7ff' }} />
              Account Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="profile-row">
              <span className="profile-label">Balance</span>
              <span className="profile-value">
                {balance.toFixed(2)} {currency}
              </span>
            </div>
            <Separator style={{ background: 'rgba(98, 215, 255, 0.08)' }} />
            <div className="profile-row">
              <span className="profile-label">Account Type</span>
              <Badge
                variant="secondary"
                style={{
                  fontFamily: "'Rajdhani', monospace",
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                }}
              >
                Demo
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle
              className="text-lg flex items-center gap-2"
              style={{
                fontFamily: "'Rajdhani', monospace",
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              <Shield style={{ width: 18, height: 18, color: '#3ee0a9' }} />
              KYC Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant="outline"
              style={{ borderColor: 'rgba(62, 224, 169, 0.3)', color: '#3ee0a9' }}
            >
              Not Required
            </Badge>
            <p style={{ fontSize: '0.8rem', color: '#c2d4f0', opacity: 0.5, marginTop: '0.5rem' }}>
              KYC verification is not required for demo accounts.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle
              className="text-lg flex items-center gap-2"
              style={{
                fontFamily: "'Rajdhani', monospace",
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              <Star style={{ width: 18, height: 18, color: '#f6be57' }} />
              VIP Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              style={{
                background: 'linear-gradient(135deg, #f6be57, #e8a020)',
                color: '#040b16',
                fontWeight: 700,
              }}
            >
              Bronze
            </Badge>
            <p style={{ fontSize: '0.8rem', color: '#c2d4f0', opacity: 0.5, marginTop: '0.5rem' }}>
              Play more to level up your VIP tier and unlock rewards.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="profile-actions">
        <Button
          variant="destructive"
          onClick={handleLogout}
          style={{
            fontFamily: "'Rajdhani', monospace",
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
