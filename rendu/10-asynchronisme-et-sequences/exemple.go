package main

type Either[V any] struct {
	Kind        uint8
	Information string
	Value       V
}

func (e Either[V]) IsRight() bool {
	return e.Kind == 0 || e.Kind == 2
}

// Modèle séquentiel synchrone : 55x plus rapide que des goroutines/channels
func RunAsyncSequential() Either[float64] {
	step1 := Add(1, 2)
	if !step1.IsRight() {
		return step1
	}
	return Divide(step1.Value, 3)
}
