package main

type Either[V any] struct {
	Kind        uint8
	Information string
	Value       V
}

func (e Either[V]) IsRight() bool {
	return e.Kind == 0 || e.Kind == 2
}

// rightPipe inliné : arrêt au premier échec sans allocation de closure
func Calculate(one, two, divisor float64) Either[float64] {
	step1 := Add(one, two)
	if !step1.IsRight() {
		return step1
	}
	return Divide(step1.Value, divisor)
}
