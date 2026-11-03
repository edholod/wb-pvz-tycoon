"""Standalone equipment simulation prototype; no Telegram/backend integration yet."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CATALOG = json.loads((ROOT / 'equipment.json').read_text(encoding='utf-8'))['items']


def new_game(balance=500000, floor_space=28):
    return {'balance': balance, 'floor_space': floor_space, 'base_capacity': 300,
            'equipment': {}, 'transactions': [], 'day': 0}


def equipment_cost(item_id, next_level):
    item = CATALOG[item_id]
    return item['prices'][next_level - 1]


def upgrade(state, item_id):
    if item_id not in CATALOG:
        raise ValueError('Unknown equipment')
    item = CATALOG[item_id]
    old = state['equipment'].get(item_id, {'level': 0, 'condition': 100})
    next_level = old['level'] + 1
    if next_level > len(item['prices']):
        raise ValueError('Maximum level reached')
    price = equipment_cost(item_id, next_level)
    if state['balance'] < price:
        raise ValueError('Insufficient funds')
    if item_id == 'shelves':
        used = state['equipment'].get('shelves', {}).get('level', 0) * item['space_per_level']
        if used + item['space_per_level'] > state['floor_space']:
            raise ValueError('Insufficient warehouse space')
    state['balance'] -= price
    state['equipment'][item_id] = {'level': next_level, 'condition': 100.0}
    state['transactions'].append({'day': state['day'], 'type': 'upgrade', 'item': item_id, 'amount': -price})
    return state


def repair(state, item_id):
    if item_id not in state['equipment']:
        raise ValueError('Item not owned')
    unit = state['equipment'][item_id]
    missing = 100 - unit['condition']
    price = round(CATALOG[item_id]['repair_base'] * unit['level'] * missing / 100)
    if state['balance'] < price:
        raise ValueError('Insufficient funds')
    state['balance'] -= price
    unit['condition'] = 100.0
    state['transactions'].append({'day': state['day'], 'type': 'repair', 'item': item_id, 'amount': -price})
    return price


def advance_days(state, days=1):
    if not isinstance(days, int) or days < 0:
        raise ValueError('Days must be a nonnegative integer')
    state['day'] += days
    for key, unit in state['equipment'].items():
        unit['condition'] = round(max(0, unit['condition'] - CATALOG[key]['wear_per_day'] * days), 2)
    return state


def effects(state):
    """Damaged equipment has reduced effect; at zero condition no effect."""
    result = {'capacity': state['base_capacity'], 'speed_bonus_pct': 0.0,
              'evidence_coverage_pct': 0.0, 'archive_days': 0,
              'comfort_bonus_pct': 0.0, 'outage_protection_minutes': 0.0,
              'uptime_bonus_pct': 0.0, 'service_bonus_pct': 0.0}
    for key, unit in state['equipment'].items():
        item = CATALOG[key]
        index = unit['level'] - 1
        factor = unit['condition'] / 100
        for prop, values in item.items():
            if not isinstance(values, list) or prop == 'prices':
                continue
            if prop == 'capacity_bonus':
                result['capacity'] += round(values[index] * factor)
            elif prop in result:
                if prop in ('evidence_coverage_pct', 'archive_days', 'outage_protection_minutes'):
                    result[prop] = round(values[index] * factor, 2)
                else:
                    result[prop] += round(values[index] * factor, 2)
    return result


if __name__ == '__main__':
    game = new_game()
    upgrade(game, 'shelves')
    upgrade(game, 'cameras')
    advance_days(game, 30)
    print(json.dumps({'state': game, 'effects': effects(game)}, ensure_ascii=False, indent=2))
