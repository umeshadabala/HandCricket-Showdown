import random, math

def randint_inclusive(a, b): return random.randint(a, b)

def get_int(prompt, lo=1, hi=10):
    try:
        n = int(input(f"{prompt} ({lo}-{hi}): "))
    except ValueError:
        return None
    return n if lo <= n <= hi else None

def choice(options, prompt):
    opts = {o.lower() for o in options}
    while True:
        c = input(prompt).strip().lower()
        if c in opts: return c
        print(f"Choose one of: {', '.join(sorted(opts))}")

def parity(n): return "even" if n % 2 == 0 else "odd"

def toss_odd_even() -> str:
    print("\nTOSS: Odd/Even")
    pick = choice(["odd","even"], "Pick (odd/even): ")
    u = None
    while u is None:
        u = get_int("Your toss number")
        if u is None: print("Enter a valid integer.")
    c = randint_inclusive(1,10)
    s = u + c
    print(f"You: {u}, CPU: {c} → Sum {s} ({parity(s)})")
    if parity(s) == pick:
        return choice(["bat","bowl"], "You won the toss! Bat or bowl? (bat/bowl): ")
    cpu_d = random.choice(["bat","bowl"])
    print(f"CPU won the toss and chooses to {cpu_d} first.")
    return "bowl" if cpu_d == "bat" else "bat"

def base_cost(score: int) -> int:
    if score < 20: return 0
    if score < 50: return 10
    if score < 100: return 20
    if score < 150: return 30
    return -1   

def scaled_revive_cost(score: int, revive_index: int) -> int:
    if score >= 150:
        return score - 70
    b = base_cost(score)
    if b < 0: b = 30
    r = max(1, min(5, revive_index))
    multipliers = {1:1.00, 2:1.10, 3:1.20, 4:1.30, 5:1.50}
    return math.ceil(b * multipliers[r])

def resolve_normal(p: int, c: int, cur: int):
    if p == c: return "out", cur, 0
    new = cur + p
    return "runs", new, p

def resolve_crazy(p: int, c: int, cur: int):
    if p == c:
        gain = p * c 
        return "runs", cur + gain, gain
    if abs(p - c) == 1:
        return "out", cur, 0
    new = cur + p
    return "runs", new, p

def player_bat(mode: str) -> tuple[int, bool]:
    score = 0
    life = 1
    used_revives = 0
    while life > 0:
        p = get_int("Pick your run")
        if p is None:
            print("Invalid input; try again.")
            continue
        c = randint_inclusive(1,10)
        print(f"You: {p} | CPU: {c}")
        status, score_after, gain = (resolve_crazy if mode=="crazy" else resolve_normal)(p, c, score)
        score = score_after
        if status == "out":
            life -= 1
            print("OUT!")
            if used_revives < 5:
                want = choice(["yes","no"], f"Revive attempt {used_revives+1}/5? (yes/no): ")
                if want == "yes":
                    cost = scaled_revive_cost(score, used_revives + 1)
                    new_score = score - cost
                    print(f"Revive cost = {cost}. Score → {new_score}.")
                    if new_score < 0:
                        print("Score went negative during sacrifice. CPU wins.")
                        return new_score, False
                    score = new_score
                    used_revives += 1
                    life = 1
                    print(f"Revived (#{used_revives}). Score now {score}.")
        else:
            print(f"+{gain} | Score: {score}")
    print(f"Innings over. Final player score: {score}")
    return score, True

def cpu_bat_until_exceeds(player_score: int, mode: str) -> int:
    cpu = 0
    life = 1
    while life > 0:
        p = get_int("Bowl your number")
        if p is None:
            print("Invalid bowl; try again.")
            continue
        c = randint_inclusive(1,10)
        print(f"You bowled: {p} | CPU picked: {c}")
        
        gain = 0
        if mode == "crazy":
            if abs(p - c) == 1:
                life -= 1
                print("WICKET! CPU all out.")
                break
            gain = c * c if p == c else c
        else: 
            if p == c:
                life -= 1
                print("WICKET! CPU all out.")
                break
            gain = c
            
        cpu += gain
        print(f"CPU Score: {cpu} (Tgt: {player_score + 1}) | +{gain}")
        
        if cpu > player_score:
            print("CPU has exceeded your score.")
            break
            
    return cpu

def cpu_sets_score(mode: str) -> int:
    cpu = 0
    life = 1
    while life > 0:
        p = get_int("Bowl your number")
        if p is None:
            print("Invalid bowl; try again.")
            continue
        c = randint_inclusive(1,10)
        print(f"You bowled: {p} | CPU picked: {c}")
        
        gain = 0
        is_out = False
        if mode == "crazy":
            if abs(p - c) == 1:
                is_out = True
            else:
                gain = c * c if p == c else c
        else: 
            if p == c:
                is_out = True
            else:
                gain = c
        
        if is_out:
            life -= 1
            print("WICKET! CPU all out.")
        else:
            cpu += gain
            print(f"CPU Score: {cpu} | +{gain}")
            
    return cpu

def main():
    random.seed()
    mode = choice(["normal","crazy"], "Choose mode (normal/crazy): ")
    role = toss_odd_even()

    if role == "bat":
        p_score, ok = player_bat(mode)
        if not ok and p_score < 0:
            return
        print("\nCPU chase: you bowl; CPU wins as soon as it exceeds your score.")
        c_score = cpu_bat_until_exceeds(p_score, mode)
        if c_score > p_score:
            print("CPU wins.")
            return
        if c_score == p_score:
            print("Tie.")
        else:
            print("You win.")
        return

    print("\nCPU bats first: you bowl.")
    c_score = cpu_sets_score(mode)
    print(f"CPU set {c_score}. Your chase target: {c_score + 1}")

    score = 0
    life = 1
    used_revives = 0
    while life > 0:
        p = get_int("Pick your run")
        if p is None:
            print("Invalid input; try again.")
            continue
        c = randint_inclusive(1,10)
        print(f"You: {p} | CPU: {c}")
        status, score_after, gain = (resolve_crazy if mode=="crazy" else resolve_normal)(p, c, score)
        score = score_after
        if status == "out":
            life -= 1
            print("OUT!")
            if used_revives < 5:
                want = choice(["yes","no"], f"Revive attempt {used_revives+1}/5? (yes/no): ")
                if want == "yes":
                    cost = scaled_revive_cost(score, used_revives + 1)
                    new_score = score - cost
                    print(f"Revive cost = {cost}. Score → {new_score}.")
                    if new_score < 0:
                        print("Score went negative during sacrifice. CPU wins.")
                        return
                    score = new_score
                    used_revives += 1
                    life = 1
                    print(f"Revived (#{used_revives}). Score now {score}.")
        else:
            print(f"+{gain} | Score: {score} | Need > {c_score} to win")
            if score > c_score:
                print("You have exceeded CPU's score. You win the chase!")
                return

    if score == c_score:
        print("Tie.")
    else:
        print("CPU wins.")

if __name__ == "__main__":
    main()