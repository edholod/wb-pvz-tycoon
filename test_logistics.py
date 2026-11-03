import unittest
from engine import new_game, upgrade
from logistics import init_logistics, receive, occupancy, issue, start_return, dispatch_return, investigate, write_off, report

class LogisticsTests(unittest.TestCase):
    def test_lifecycle(self):
        s = new_game(); ids = receive(s, [1000, 2000], worker_skill=100, seed=1)
        self.assertEqual(occupancy(s)['occupied'], 2)
        issue(s, ids[0]); start_return(s, ids[1]); dispatch_return(s, ids[1])
        self.assertEqual(occupancy(s)['occupied'], 0)
        self.assertEqual(report(s)['stats']['issued'], 1)
    def test_overflow_and_shelves(self):
        s = new_game(); s['base_capacity'] = 1
        receive(s, [100]*5, seed=2)
        self.assertEqual(occupancy(s)['occupied'], 5)
        self.assertEqual(occupancy(s)['load_pct'], 500)
        upgrade(s, 'shelves')
        self.assertEqual(occupancy(s)['capacity'], 76)
    def test_writeoff_safeguards(self):
        s = new_game(); ids = receive(s, [12000], worker_skill=0, seed=31)
        pid = ids[0]; s['parcels'][pid]['status'] = 'misplaced'
        with self.assertRaises(ValueError): write_off(s, pid, True, True)
        investigate(s, pid)
        with self.assertRaises(ValueError): write_off(s, pid, False, True)
        self.assertEqual(write_off(s, pid, True, True), 12000)
        self.assertEqual(s['balance'], 488000)
        with self.assertRaises(ValueError): write_off(s, pid, True, True)
    def test_found(self):
        s = new_game(); pid = receive(s, [500], seed=1)[0]
        s['parcels'][pid]['status'] = 'misplaced'
        investigate(s, pid, find=True)
        issue(s, pid)
        self.assertEqual(s['balance'], 500000)
    def test_invalid(self):
        s = new_game()
        with self.assertRaises(ValueError): receive(s, [-10])
        with self.assertRaises(ValueError): issue(s, 'invalid')

if __name__ == '__main__': unittest.main()
