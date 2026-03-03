import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store';
import { logout } from '@/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { User, LogOut, ChevronDown, Wallet, UserCircle } from 'lucide-react';

export function LobbyHeader() {
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
    <header className="lobby-header">
      <div className="lobby-header-left">
        <h1 className="lobby-brand">
          <span className="lobby-brand-main">Pyavchik</span>
          <span className="lobby-brand-accent">Casino</span>
        </h1>
      </div>

      <div className="lobby-header-right">
        <div className="lobby-balance-pill">
          <span className="lobby-balance-label">
            <Wallet
              style={{
                width: 10,
                height: 10,
                display: 'inline',
                verticalAlign: '-1px',
                marginRight: 4,
              }}
            />
            Balance
          </span>
          <span className="lobby-balance-value">
            {balance.toFixed(2)} {currency}
          </span>
        </div>

        <Button variant="outline" size="sm" className="lobby-deposit-btn" disabled>
          Deposit
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="lobby-user-btn">
              <User className="h-4 w-4" />
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <UserCircle className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
