import unittest
from engine import new_game
from incidents import generate_incidents,resolve_incident,init_incidents
from simulation import simulate_day

class IncidentTests(unittest.TestCase):
    def test_generate_and_resolve(self):
        s=new_game(); x=generate_incidents(s)[0]
        opt=x['options'][0]; before=s['balance']
        result=resolve_incident(s,x['id'],opt['id'])
        self.assertEqual(s['balance'],before-opt['cost_rub'])
        self.assertEqual(result['kind'],x['kind'])
        self.assertEqual(len(s['incidents']['pending']),0)
    def test_duplicate_resolution_rejected(self):
        s=new_game();x=generate_incidents(s)[0]
        resolve_incident(s,x['id'],x['options'][0]['id'])
        with self.assertRaises(ValueError):resolve_incident(s,x['id'],x['options'][0]['id'])
    def test_invalid_decision(self):
        s=new_game();x=generate_incidents(s)[0]
        with self.assertRaises(ValueError):resolve_incident(s,x['id'],'bad')
    def test_insufficient_funds(self):
        s=new_game(balance=0)
        x=next(t for t in __import__('incidents').TEMPLATES if any(o[2]<0 for o in t[3]))
        s['incidents']={'next_id':2,'pending':[{'id':1,'kind':x[0]}],'resolved':[],'reputation':50,'seed':1}
        paid=next(o for o in x[3] if o[2]<0)
        with self.assertRaises(ValueError):resolve_incident(s,1,paid[0])
    def test_day_generates_incidents(self):
        s=new_game();r=simulate_day(s)
        self.assertGreater(len(r['incidents']),0)
    def test_deterministic(self):
        a,b=new_game(),new_game()
        self.assertEqual(generate_incidents(a,5),generate_incidents(b,5))
    def test_no_auto_charge(self):
        a,b=new_game(),new_game()
        generate_incidents(a,3)
        self.assertEqual(a['balance'],b['balance'])
if __name__=='__main__':unittest.main()
