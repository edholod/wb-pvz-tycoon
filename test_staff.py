import unittest
from engine import new_game
from staff import init_staff,hire,fire,train,scheduled,resolve_shift,delay_wages,pay_arrears
from simulation import simulate_days
class StaffTests(unittest.TestCase):
 def test_schedule(self):
  s=new_game();a=hire(s,'A');b=hire(s,'B')
  self.assertTrue(scheduled(a,1));self.assertFalse(scheduled(b,1))
  self.assertTrue(scheduled(b,3))
 def test_training(self):
  s=new_game();e=hire(s);before=s['balance'];train(s,e['id']);self.assertEqual(s['balance'],before-3500);self.assertEqual(e['skill'],73)
 def test_fire(self):
  s=new_game();e=hire(s);fire(s,e['id']);self.assertFalse(scheduled(e,1))
 def test_determinism(self):
  a=new_game();b=new_game();self.assertEqual(simulate_days(a,10),simulate_days(b,10))
 def test_no_show_replacement(self):
  s=new_game();e=hire(s,reliability=0);r=resolve_shift(s,1);self.assertTrue(r['replacement']);self.assertTrue(r['staffed'])
 def test_arrears(self):
  s=new_game();e=hire(s);delay_wages(s,3000);self.assertEqual(e['morale'],67);pay_arrears(s,3000);self.assertEqual(s['personnel']['wage_arrears'],0)
 def test_simulation_integrated(self):
  s=new_game();r=simulate_days(s,3);self.assertIn('shift',r[-1]);self.assertEqual(len(s['personnel']['shift_log']),3)
if __name__=='__main__':unittest.main()
