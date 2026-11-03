import unittest
from staff import hire, resolve_shift

class ExperienceTests(unittest.TestCase):
    def test_skill_of_hired_employee_is_preserved(self):
        state={'balance':100000,'day':1,'transactions':[]}
        e=hire(state,name='Мария',skill=90)
        self.assertEqual(e['skill'],90)
        self.assertEqual(e['name'],'Мария')
    def test_shift_uses_employee_skill(self):
        state={'balance':100000,'day':1,'transactions':[]}
        hire(state,name='Мария',skill=90,reliability=1)
        shift=resolve_shift(state,1)
        if shift['worker_ids']:
            self.assertEqual(shift['skill'],90)
        else:
            self.assertTrue(shift['replacement'])

if __name__=='__main__':unittest.main()
