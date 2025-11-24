import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/hooks/useWallet';
import {
  Wallet,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Plus,
  Minus,
  History,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { convertAndFormatINR } from '@/lib/currency';

const WalletCard = () => {
  const { wallet, transactions, loading, addFunds, withdrawFunds } = useWallet();
  const [showTransactions, setShowTransactions] = useState(false);

  const formatCurrency = (amount: number | undefined) => {
    return convertAndFormatINR(amount || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleAddFunds = async () => {
    try {
      await addFunds(50); // Add $50 for demo
    } catch (error) {
      console.error('Error adding funds:', error);
      alert('Failed to add funds');
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(prompt('Enter amount to withdraw:') || '0');
    if (amount > 0 && amount <= (wallet?.balance || 0)) {
      try {
        await withdrawFunds(amount);
      } catch (error) {
        console.error('Error withdrawing funds:', error);
        alert('Failed to withdraw funds');
      }
    } else {
      alert('Invalid amount or insufficient balance');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-24 mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!wallet) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Unable to load wallet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
          Your Wallet
        </CardTitle>
        <CardDescription className="text-sm">
          Manage your 6Degree balance and transactions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
        {/* Balance Section */}
        <div className="text-center">
          <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">
            {formatCurrency(wallet?.balance)}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground">Available Balance</div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <div className="text-center p-2 sm:p-3 bg-[#3AB795]/10 dark:bg-[#3AB795]/5 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-[#3AB795] mb-1">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm font-medium">Earned</span>
            </div>
            <div className="font-bold text-sm sm:text-base">{formatCurrency(wallet?.totalEarned)}</div>
          </div>
          <div className="text-center p-2 sm:p-3 bg-white/5 dark:bg-white/5 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-white/70 mb-1">
              <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm font-medium">Spent</span>
            </div>
            <div className="font-bold text-sm sm:text-base">{formatCurrency(wallet?.totalSpent)}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              onClick={handleAddFunds}
              className="flex-1"
              size="sm"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="text-xs sm:text-sm">Add $50</span>
            </Button>
            <Button
              onClick={handleWithdraw}
              variant="outline"
              className="flex-1"
              size="sm"
              disabled={(wallet?.balance || 0) === 0}
            >
              <Minus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="text-xs sm:text-sm">Withdraw</span>
            </Button>
          </div>
          <Button
            onClick={() => setShowTransactions(!showTransactions)}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <History className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="text-xs sm:text-sm">Transaction History</span>
            {showTransactions ? (
              <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
            ) : (
              <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
            )}
          </Button>
        </div>

        {/* Transaction History */}
        {showTransactions && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <h4 className="font-semibold text-sm">Recent Transactions</h4>
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No transactions yet
              </p>
            ) : (
              <div className="space-y-2">
                {transactions.slice(0, 10).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded"
                  >
                    <div className="flex items-center gap-2">
                      {transaction.type === 'credit' ? (
                        <div className="w-2 h-2 rounded-full bg-[#3AB795]"></div>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-[#F25C4D]"></div>
                      )}
                      <div>
                        <div className="text-sm font-medium">
                          {transaction.description}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(transaction.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-sm font-medium ${
                          transaction.type === 'credit'
                            ? 'text-[#3AB795]'
                            : 'text-[#F25C4D]'
                        }`}
                      >
                        {transaction.type === 'credit' ? '+' : '-'}
                        {formatCurrency(transaction?.amount)}
                      </div>
                      <Badge
                        variant={
                          transaction.status === 'completed'
                            ? 'default'
                            : transaction.status === 'pending'
                            ? 'secondary'
                            : 'destructive'
                        }
                        className="text-xs"
                      >
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WalletCard;