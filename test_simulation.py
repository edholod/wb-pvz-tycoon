import unittest
from engine import new_game, upgrade
from simulation import init_operations, simulate_day, simulate_days

class SimulationTests(unittest.TestCase):
    def test_reproducible(self):
        a,b=new_game(),new_game()
        self.assertEqual(simulate_days(a,4),simulate_days(b,4))
    def test_money_and_transactions(self):
        s=new_game(); r=simulate_day(s)
        self.assertEqual(r['balance_rub'],s['balance'])
        self.assertEqual(sum(t['amount'] for t in s['transactions']),s['balance']-500000)
    def test_warehouse(self):
        s=new_game(); simulate_days(s,5)
        self.assertGreater(len(s['parcels']),0)
        self.assertGreaterEqual(s['logistics_stats']['issued'],0)
    def test_no_automatic_writeoff(self):
        s=new_game(); simulate_days(s,20)
        self.assertFalse(any(t['type']=='parcel_writeoff' for t in s['transactions']))
    def test_equipment_effect(self):
        a=new_game(); b=new_game(); upgrade(b,'shelves')
        simulate_day(a);simulate_day(b)
        self.assertGreater(b['base_capacity']+75,a['base_capacity'])
    def test_bad_count(self):
        with self.assertRaises(ValueError):simulate_days(new_game(),91)
    def test_reports(self):
        s=new_game();reports=simulate_days(s,3)
        self.assertEqual([x['day'] for x in reports],[1,2,3])
        self.assertEqual(len(s['operations']['daily_reports']),3)
if __name__=='__main__': unittest.main()
