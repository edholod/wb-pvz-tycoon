import unittest
from engine import new_game, upgrade, repair, advance_days, effects

class EngineTests(unittest.TestCase):
    def test_purchase(self):
        s = new_game(); upgrade(s, 'shelves')
        self.assertEqual(s['balance'], 492000)
        self.assertEqual(effects(s)['capacity'], 375)
    def test_upgrade(self):
        s = new_game(); upgrade(s, 'shelves'); upgrade(s, 'shelves')
        self.assertEqual(s['balance'], 478000)
        self.assertEqual(effects(s)['capacity'], 450)
    def test_no_money(self):
        with self.assertRaises(ValueError): upgrade(new_game(100), 'pc')
    def test_no_space(self):
        with self.assertRaises(ValueError): upgrade(new_game(floor_space=0), 'shelves')
    def test_wear_repair(self):
        s = new_game(); upgrade(s, 'cameras'); advance_days(s, 100)
        self.assertLess(s['equipment']['cameras']['condition'], 100)
        cost = repair(s, 'cameras')
        self.assertGreater(cost, 0)
        self.assertEqual(s['equipment']['cameras']['condition'], 100)
    def test_max_level(self):
        s = new_game()
        for _ in range(3): upgrade(s, 'router')
        with self.assertRaises(ValueError): upgrade(s, 'router')

if __name__ == '__main__': unittest.main()
