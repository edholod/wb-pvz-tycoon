"""Accelerated, deterministic daily PVZ operations (fictional game balancing)."""
import random
from engine import advance_days, effects
from staff import init_staff, hire, resolve_shift
from logistics import init_logistics, receive, issue, start_return, dispatch_return, occupancy
from incidents import init_incidents, generate_incidents

REVIEWS = {
  1: ['Сотрудник смотрел так, будто я должен ему аренду.', 'Пришёл за заказом, а настроение осталось на складе.'],
  2: ['Очередь длиннее моей истории заказов.', 'Пакет нашли, но сначала искали смысл жизни.'],
  3: ['Нормально. Зеркало честнее, чем хотелось бы.', 'Выдали быстро, но музыка странная.'],
  4: ['Всё хорошо, даже коробка почти целая.', 'Сотрудник помог найти заказ.'],
  5: ['Забрал заказ за минуту, рекорд!', 'Очень чисто, спасибо за помощь!']
}

def init_operations(state, seed=13, rent=45000, base_daily_arrivals=45):
    init_logistics(state, seed)
    if 'personnel' not in state:
        init_staff(state, seed)
        hire(state, 'Алексей', schedule='2/2')
        hire(state, 'Марина', schedule='2/2')
    state.setdefault('operations', {'seed': seed, 'rent': rent, 'base_daily_arrivals': base_daily_arrivals,
        'rating': 4.5, 'reviews': [], 'staff': {'reliability': 0.94, 'skill': 70},
        'assistant': False, 'autohire_replacement': True, 'daily_reports': [], 'pending_events': [],
        'review_count': 0, 'rating_sum': 0, 'max_reviews': 250})
    return state

def _charge(state, amount, kind):
    amount = int(round(amount))
    state['balance'] -= amount
    state['transactions'].append({'day': state['day'], 'type': kind, 'amount': -amount})
    return amount

def _income(state, amount, kind):
    amount = int(round(amount))
    state['balance'] += amount
    state['transactions'].append({'day': state['day'], 'type': kind, 'amount': amount})
    return amount

def simulate_day(state):
    init_operations(state)
    op = state['operations']
    rng = random.Random(op['seed'])
    before = state['balance']
    day = state['day'] + 1
    advance_days(state, 1)
    shift = resolve_shift(state, day)
    no_show = any(e['type']=='staff_no_show' for e in shift['events'])
    replacement = shift['replacement']
    staffed = shift['staffed']
    if shift['wage']:
        _charge(state, shift['wage'], 'replacement_wage' if replacement else 'shift_wage')
    if op['assistant'] and staffed:
        _charge(state, 2200, 'assistant_wage')
    _charge(state, op['rent']/30, 'rent_daily')
    _charge(state, 9500/30, 'utilities_internet_daily')
    # Day-of-week and annual seasonality, not actual WB forecast.
    seasonal = {1:.77,2:.72,3:.85,4:.92,5:.98,6:1.03,7:.96,8:1.08,9:1.16,10:1.22,11:1.38,12:1.75}
    month = ((day-1)//30)%12+1
    demand = op['base_daily_arrivals']*seasonal[month]*(0.88 if day%7 in (0,6) else 1.0)
    arrivals = max(0, int(rng.gauss(demand, max(2,demand*.12)))) if staffed else 0
    incoming = [rng.randint(300,9000) for _ in range(arrivals)]
    ids = receive(state, incoming, worker_skill=shift['skill'], assistant=op['assistant'] and staffed, seed=rng.randrange(2**32)) if staffed else []
    stored = [pid for pid,p in state['parcels'].items() if p['status']=='stored']
    rng.shuffle(stored)
    speed = 1 + effects(state)['speed_bonus_pct']/100
    throughput = max(0, int((40 if staffed else 0)*speed*(1.25 if op['assistant'] else 1)))
    issued = returned = 0
    turnover = 0
    for pid in stored[:throughput]:
        p = state['parcels'][pid]
        if rng.random() < .13:
            start_return(state, pid)
            dispatch_return(state, pid)
            returned += 1
        else:
            issue(state, pid)
            issued += 1
            turnover += p['value_rub']
    # Illustrative 5% game tariff; not an official WB rate.
    revenue = _income(state, turnover*.05, 'game_remuneration')
    _charge(state, issued*3, 'consumables')
    load = occupancy(state)['load_pct']
    quality = max(0.05, min(.96, .78 + (shift['skill']-70)*.002 - max(0,load-85)*.002 - (.25 if no_show else 0)))
    reviews=[]
    # Roughly one review per game hour while open; bounded by serviced clients.
    for hour in range(9,22):
        if issued+returned == 0 or rng.random() >= min(.85,(issued+returned)/70):
            continue
        score = rng.choices([1,2,3,4,5], weights=[(1-quality)*2, (1-quality), .13, quality*.55, quality*1.7])[0]
        text = rng.choice(REVIEWS[score])
        review = {'day': day, 'hour': hour, 'stars': score, 'text': text}
        reviews.append(review)
        op['review_count'] += 1
        op['rating_sum'] += score
    op['reviews'].extend(reviews)
    op['reviews'] = op['reviews'][-op['max_reviews']:]
    if op['review_count']:
        op['rating'] = round(op['rating_sum']/op['review_count'],2)
    events=list(shift['events'])
    if no_show:
        events.append({'type':'no_show','resolution':'replacement' if replacement else 'closed'})
    if load > 85:
        events.append({'type':'warehouse_overload','load_pct':load})
    if not staffed:
        events.append({'type':'closed_shift'})
    # Pending misplaced parcels require player decision; never auto-charge.
    misplaced = sum(p['status']=='misplaced' for p in state['parcels'].values())
    if misplaced:
        events.append({'type':'inventory_search_required','count':misplaced})
    op['pending_events'].extend(events)
    init_incidents(state)
    # Up to two new decisions daily; unresolved decisions stay pending.
    incidents = generate_incidents(state, 1 + (day % 3 == 0))
    report={'day':day,'month':month,'arrivals':arrivals,'issued':issued,'returned':returned,
        'turnover_rub':turnover,'remuneration_rub':revenue,'net_cash_change_rub':state['balance']-before,
        'balance_rub':state['balance'],'warehouse_load_pct':load,'rating':op['rating'],
        'reviews':reviews,'events':events,'incidents':incidents,'shift':shift}
    op['daily_reports'].append(report)
    op['daily_reports']=op['daily_reports'][-90:]
    op['seed']=rng.randrange(2**32)
    return report

def simulate_days(state, count=1):
    if not isinstance(count,int) or isinstance(count,bool) or count<0 or count>90:
        raise ValueError('Count must be integer from 0 to 90')
    return [simulate_day(state) for _ in range(count)]
