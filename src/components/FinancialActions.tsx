import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Credentials {
  login: string;
  password: string;
  fastex_user_id: string;
  ftn_address: string;
  withdrawal_amount: string;
}

interface FinancialActionsProps {
  isConnected: boolean;
  getRate: () => Promise<void>;
  swapTransactions: (amount: string, currency: string) => Promise<void>;
  collectBonus: (bonusId: number) => Promise<void>;
  payoutFtn: (amount: string, fastexUserId: string, ftnAddress: string) => Promise<void>;
  credentials: Credentials; // Pass credentials to initialize internal state
}

export const FinancialActions: React.FC<FinancialActionsProps> = ({
  isConnected,
  getRate,
  swapTransactions,
  collectBonus,
  payoutFtn,
  credentials,
}) => {
  const [swapAmount, setSwapAmount] = useState('1.0');
  const [swapCurrency, setSwapCurrency] = useState('FTN');
  const [bonusId, setBonusId] = useState(1);

  // Internal states for withdrawal, initialized from credentials
  const [internalWithdrawalAmount, setInternalWithdrawalAmount] = useState(credentials.withdrawal_amount);
  const [internalWithdrawalFastexId, setInternalWithdrawalFastexId] = useState(credentials.fastex_user_id);
  const [internalWithdrawalFtnAddress, setInternalWithdrawalFtnAddress] = useState(credentials.ftn_address);

  // Update internal states if credentials change externally
  useEffect(() => {
    setInternalWithdrawalAmount(credentials.withdrawal_amount);
    setInternalWithdrawalFastexId(credentials.fastex_user_id);
    setInternalWithdrawalFtnAddress(credentials.ftn_address);
  }, [credentials]);

  const handleSwap = async () => {
    await swapTransactions(swapAmount, swapCurrency);
  };

  const handleCollectBonus = async () => {
    await collectBonus(bonusId);
  };

  const handlePayoutFtn = async () => {
    await payoutFtn(internalWithdrawalAmount, internalWithdrawalFastexId, internalWithdrawalFtnAddress);
  };

  return (
    <Card className="bg-card text-card-foreground border-border shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Financial Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button onClick={getRate} disabled={!isConnected} className="w-full">Get Rate</Button>

        <Dialog>
          <DialogTrigger asChild>
            <Button disabled={!isConnected} className="w-full">Swap Transactions</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground border-border">
            <DialogHeader>
              <DialogTitle>Swap Transactions</DialogTitle>
              <DialogDescription>Specify amount and currency to swap.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="swap-amount" className="text-right">Amount</Label>
                <Input id="swap-amount" value={swapAmount} onChange={(e) => setSwapAmount(e.target.value)} className="col-span-3 bg-input text-foreground border-border" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="swap-currency" className="text-right">Currency</Label>
                <Input id="swap-currency" value={swapCurrency} onChange={(e) => setSwapCurrency(e.target.value)} className="col-span-3 bg-input text-foreground border-border" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleSwap}>Swap</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button disabled={!isConnected} className="w-full">Collect Bonus</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground border-border">
            <DialogHeader>
              <DialogTitle>Collect Bonus</DialogTitle>
              <DialogDescription>Enter the bonus ID to collect.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bonus-id" className="text-right">Bonus ID</Label>
                <Input id="bonus-id" type="number" value={bonusId} onChange={(e) => setBonusId(parseInt(e.target.value))} className="col-span-3 bg-input text-foreground border-border" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCollectBonus}>Collect</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button disabled={!isConnected} className="w-full">Withdraw FTN</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground border-border">
            <DialogHeader>
              <DialogTitle>Withdraw FTN</DialogTitle>
              <DialogDescription>Enter withdrawal details.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="withdrawal-amount" className="text-right">Amount</Label>
                <Input id="withdrawal-amount" value={internalWithdrawalAmount} onChange={(e) => setInternalWithdrawalAmount(e.target.value)} className="col-span-3 bg-input text-foreground border-border" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="withdrawal-fastex-id" className="text-right">Fastex User ID</Label>
                <Input id="withdrawal-fastex-id" value={internalWithdrawalFastexId} onChange={(e) => setInternalWithdrawalFastexId(e.target.value)} className="col-span-3 bg-input text-foreground border-border" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="withdrawal-ftn-address" className="text-right">FTN Address</Label>
                <Input id="withdrawal-ftn-address" value={internalWithdrawalFtnAddress} onChange={(e) => setInternalWithdrawalFtnAddress(e.target.value)} className="col-span-3 bg-input text-foreground border-border" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handlePayoutFtn}>Withdraw</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};