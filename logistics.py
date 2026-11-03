"""Deterministic, auditable parcel lifecycle for the WB PVZ game prototype.
Fictional game rules, not official Wildberries liability or tariff rules.
"""
import random
from engine import effects

ACTIVE = {'received', 'stored', 'misplaced', 'return_pending'}

def init_logistics(state, seed=1):
    state.setdefault('parcels', {})
    state.setdefault('logistics_events', [])
    state.setdefault('logistics_stats', {'received': 0, 'issued': 0, 'returned': 0, 'misplaced': 0, 'found': 0, 'written_off': 0})
    state.setdefault('next_parcel_id', 1)
    state.setdefault('rng_seed', seed)
    return state

def occupancy(state):
    init_logistics(state)
    count = sum(p['status'] in ACTIVE for p in state['parcels'].values())
    cap = max(1, effects(state)['capacity'])
    return {'occupied': count, 'capacity': cap, 'load_pct': round(100 * count / cap, 1)}

def _event(state, kind, parcel_id, **details):
    state['logistics_events'].append({'day': state['day'], 'type': kind, 'parcel_id': parcel_id, **details})

def receive(state, values, worker_skill=65, assistant=False, seed=None):
    """Receive parcels; overloaded storage increases chance of misplacement.
    A seeded RNG allows repeatable tests and simulation replays.
    """
    init_logistics(state)
    if not 0 <= worker_skill <= 100:
        raise ValueError('Invalid skill')
    if any(not isinstance(v, int) or isinstance(v, bool) or v <= 0 for v in values):
        raise ValueError('Parcel values must be positive integer rubles')
    rng = random.Random(state['rng_seed'] if seed is None else seed)
    created = []
    for value in values:
        load = occupancy(state)['load_pct']
        overload = max(0, load - 85) / 100
        base = 0.003 + overload * 0.11 + (100-worker_skill) / 100 * 0.015
        if assistant:
            base *= 0.55
        shelves = state['equipment'].get('shelves', {})
        if shelves:
            base *= max(0.65, 1 - 0.035 * shelves['level'] * shelves['condition']/100)
        misplaced = rng.random() < min(0.30, base)
        pid = f"P{state['next_parcel_id']:07d}"
        state['next_parcel_id'] += 1
        state['parcels'][pid] = {'value_rub': value, 'status': 'misplaced' if misplaced else 'stored', 'received_day': state['day'], 'investigated': False}
        state['logistics_stats']['received'] += 1
        if misplaced:
            state['logistics_stats']['misplaced'] += 1
            _event(state, 'misplaced', pid, load_pct=load)
        else:
            _event(state, 'received', pid, load_pct=load)
        created.append(pid)
    if seed is None:
        state['rng_seed'] = rng.randrange(2**32)
    return created

def _parcel(state, pid):
    init_logistics(state)
    if pid not in state['parcels']:
        raise ValueError('Unknown parcel')
    return state['parcels'][pid]

def issue(state, pid):
    p = _parcel(state, pid)
    if p['status'] != 'stored':
        raise ValueError('Parcel not available for issue')
    p['status'] = 'issued'
    state['logistics_stats']['issued'] += 1
    _event(state, 'issued', pid)

def start_return(state, pid):
    p = _parcel(state, pid)
    if p['status'] != 'stored':
        raise ValueError('Only stored parcels can be returned')
    p['status'] = 'return_pending'
    _event(state, 'return_pending', pid)

def dispatch_return(state, pid):
    p = _parcel(state, pid)
    if p['status'] != 'return_pending':
        raise ValueError('Return not prepared')
    p['status'] = 'returned'
    state['logistics_stats']['returned'] += 1
    _event(state, 'returned', pid)

def investigate(state, pid, find=False):
    p = _parcel(state, pid)
    if p['status'] != 'misplaced':
        raise ValueError('Parcel is not misplaced')
    p['investigated'] = True
    if find:
        p['status'] = 'stored'
        state['logistics_stats']['found'] += 1
    _event(state, 'found' if find else 'investigated', pid)

def write_off(state, pid, liability_confirmed=False, evidence_reviewed=False):
    """Charge only when explicitly confirmed by game rules after investigation."""
    p = _parcel(state, pid)
    if p['status'] != 'misplaced' or not p['investigated'] or not evidence_reviewed or not liability_confirmed:
        raise ValueError('Investigation, evidence review and liability confirmation required')
    amount = p['value_rub']
    p['status'] = 'written_off'
    state['balance'] -= amount
    state['transactions'].append({'day': state['day'], 'type': 'parcel_writeoff', 'item': pid, 'amount': -amount})
    state['logistics_stats']['written_off'] += 1
    _event(state, 'written_off', pid, amount=amount)
    return amount

def report(state):
    return {'storage': occupancy(state), 'stats': dict(state['logistics_stats']), 'balance_rub': state['balance'], 'open_investigations': [pid for pid, p in state['parcels'].items() if p['status'] == 'misplaced']}
